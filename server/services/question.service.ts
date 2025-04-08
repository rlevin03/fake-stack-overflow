// server/services/question.service.ts

import { ObjectId } from 'mongodb';
import { QueryOptions } from 'mongoose';
import {
  DatabaseComment,
  DatabaseQuestion,
  DatabaseTag,
  // Keep OrderType if you use it elsewhere in your code:
  OrderType,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  Question,
  QuestionResponse,
  QuestionVoteResponse,
  FakeSOSocket,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import TagModel from '../models/tags.model';
import CommentModel from '../models/comments.model';
import { parseKeyword, parseTags } from '../utils/parse.util';
import { checkTagInQuestion } from './tag.service';
import {
  sortQuestionsByActive,
  sortQuestionsByMostViews,
  sortQuestionsByNewest,
  sortQuestionsByUnanswered,
} from '../utils/sort.util';
import UserModel from '../models/users.model';

// NEW IMPORTS:
import { getTop10ByPoints, getRankForUser, appendPointsHistory } from './user.service';

/**
 * Checks if keywords exist in a question's title or text.
 * @param {Question} q - The question to check
 * @param {string[]} keywordlist - The keywords to check
 * @returns {boolean} - `true` if any keyword is found
 */
const checkKeywordInQuestion = (q: Question, keywordlist: string[]): boolean => {
  for (const w of keywordlist) {
    if (q.title.includes(w) || q.text.includes(w)) {
      return true;
    }
  }
  return false;
};

/**
 * Retrieves questions ordered by specified criteria.
 * Accepts a plain string, validates it, and defaults to 'mostViewed'.
 * @param {string} orderParam - The order type (string) from the query
 * @returns {Promise<PopulatedDatabaseQuestion[]>} - The ordered list of questions
 */
export const getQuestionsByOrder = async (
  orderParam: string,
): Promise<PopulatedDatabaseQuestion[]> => {
  // Define valid orders (from your OrderType)
  const validOrders: OrderType[] = ['active', 'unanswered', 'newest', 'mostViewed'];

  // Validate or default to 'mostViewed'
  const order: OrderType = validOrders.includes(orderParam as OrderType)
    ? (orderParam as OrderType)
    : 'mostViewed';

  try {
    const qlist: PopulatedDatabaseQuestion[] = await QuestionModel.find().populate<{
      tags: DatabaseTag[];
      answers: PopulatedDatabaseAnswer[];
      comments: DatabaseComment[];
    }>([
      { path: 'tags', model: TagModel },
      { path: 'answers', model: AnswerModel, populate: { path: 'comments', model: CommentModel } },
      { path: 'comments', model: CommentModel },
    ]);

    switch (order) {
      case 'active':
        return sortQuestionsByActive(qlist);
      case 'unanswered':
        return sortQuestionsByUnanswered(qlist);
      case 'newest':
        return sortQuestionsByNewest(qlist);
      case 'mostViewed':
      default:
        return sortQuestionsByMostViews(qlist);
    }
  } catch (error) {
    return [];
  }
};

/**
 * Filters questions by the user who asked them.
 * @param {PopulatedDatabaseQuestion[]} qlist - The list of questions
 * @param {string} askedBy - The username to filter by
 * @returns {PopulatedDatabaseQuestion[]} - Filtered questions
 */
export const filterQuestionsByAskedBy = (
  qlist: PopulatedDatabaseQuestion[],
  askedBy: string,
): PopulatedDatabaseQuestion[] => qlist.filter(q => q.askedBy === askedBy);

/**
 * Filters questions by search string containing tags and/or keywords.
 * @param {PopulatedDatabaseQuestion[]} qlist - The list of questions
 * @param {string} search - The search string
 * @returns {PopulatedDatabaseQuestion[]} - Filtered list of questions
 */
export const filterQuestionsBySearch = (
  qlist: PopulatedDatabaseQuestion[],
  search: string,
): PopulatedDatabaseQuestion[] => {
  const searchTags = parseTags(search);
  const searchKeyword = parseKeyword(search);

  return qlist.filter((q: Question) => {
    if (searchKeyword.length === 0 && searchTags.length === 0) {
      return true;
    }

    if (searchKeyword.length === 0) {
      return checkTagInQuestion(q, searchTags);
    }

    if (searchTags.length === 0) {
      return checkKeywordInQuestion(q, searchKeyword);
    }

    return checkKeywordInQuestion(q, searchKeyword) || checkTagInQuestion(q, searchTags);
  });
};

/**
 * Fetches a question by ID and increments its view count.
 * @param {string} qid - The question ID
 * @param {string} username - The username requesting the question
 * @returns {Promise<QuestionResponse | { error: string }>} - The question with incremented views or error
 */
export const fetchAndIncrementQuestionViewsById = async (
  qid: string,
  username: string,
): Promise<PopulatedDatabaseQuestion | { error: string }> => {
  try {
    const q: PopulatedDatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: new ObjectId(qid) },
      { $addToSet: { views: username } },
      { new: true },
    ).populate<{
      tags: DatabaseTag[];
      answers: PopulatedDatabaseAnswer[];
      comments: DatabaseComment[];
    }>([
      { path: 'tags', model: TagModel },
      { path: 'answers', model: AnswerModel, populate: { path: 'comments', model: CommentModel } },
      { path: 'comments', model: CommentModel },
    ]);

    if (!q) {
      throw new Error('Question not found');
    }

    return q;
  } catch (error) {
    return { error: 'Error when fetching and updating a question' };
  }
};

/**
 * Saves a new question to the database, awards points to the user,
 * and emits updated leaderboard and user rank via Socket.IO.
 *
 * @param {Question} question - The question to save
 * @param {FakeSOSocket} socket - The socket instance for broadcasting updates
 * @returns {Promise<QuestionResponse>} - The saved question or error message
 */
export const saveQuestion = async (
  question: Question,
  socket: FakeSOSocket,
): Promise<QuestionResponse> => {
  try {
    // 1) Create the question
    const result: DatabaseQuestion = await QuestionModel.create(question);

    // 2) Award points: push the question ID and increment user points by 10
    await UserModel.updateOne(
      { username: question.askedBy },
      { $push: { questionsAsked: result._id }, $inc: { points: 10 } },
    );

    const userRecord = await UserModel.findOne({ username: question.askedBy });
    if (userRecord) {
      const historyEntry = `Awarded 10 points for posting a new question at ${new Date().toLocaleString()}`;
      await appendPointsHistory(userRecord._id.toString(), historyEntry);
    }

    // 3) Fetch the updated top 10
    const top10 = await getTop10ByPoints();
    if (Array.isArray(top10)) {
      socket.emit('top10Response', top10);
    } else {
      // Optionally: socket.emit('error', top10.error);
    }

    // 4) Fetch updated user rank
    const rankResult = await getRankForUser(question.askedBy);
    if (!('error' in rankResult)) {
      socket.emit('userRankResponse', { rank: rankResult.rank });
    } else {
      // Optionally: socket.emit('error', rankResult.error);
    }

    return result;
  } catch (error: unknown) {
    return { error: 'Error when saving a question' };
  }
};

/**
 * Adds a vote to a question, increments user points by 1,
 * and broadcasts an updated top 10 leaderboard to all clients.
 *
 * @param {string} qid - The question ID
 * @param {string} username - The username who voted
 * @param {'upvote' | 'downvote'} voteType - The vote type
 * @param {FakeSOSocket} socket - The socket instance for broadcasting
 * @returns {Promise<QuestionVoteResponse>} - The updated vote result
 */
export const addVoteToQuestion = async (
  qid: string,
  username: string,
  voteType: 'upvote' | 'downvote',
  socket: FakeSOSocket,
): Promise<QuestionVoteResponse> => {
  let updateOperation: QueryOptions;

  if (voteType === 'upvote') {
    updateOperation = [
      {
        $set: {
          upVotes: {
            $cond: [
              { $in: [username, '$upVotes'] },
              { $filter: { input: '$upVotes', as: 'u', cond: { $ne: ['$$u', username] } } },
              { $concatArrays: ['$upVotes', [username]] },
            ],
          },
          downVotes: {
            $cond: [
              { $in: [username, '$upVotes'] },
              '$downVotes',
              { $filter: { input: '$downVotes', as: 'd', cond: { $ne: ['$$d', username] } } },
            ],
          },
        },
      },
    ];
  } else {
    updateOperation = [
      {
        $set: {
          downVotes: {
            $cond: [
              { $in: [username, '$downVotes'] },
              { $filter: { input: '$downVotes', as: 'd', cond: { $ne: ['$$d', username] } } },
              { $concatArrays: ['$downVotes', [username]] },
            ],
          },
          upVotes: {
            $cond: [
              { $in: [username, '$downVotes'] },
              '$upVotes',
              { $filter: { input: '$upVotes', as: 'u', cond: { $ne: ['$$u', username] } } },
            ],
          },
        },
      },
    ];
  }

  try {
    // 1) Update the question's upVotes/downVotes
    const result: DatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: qid },
      updateOperation,
      { new: true },
    );

    if (!result) {
      return { error: 'Question not found!' };
    }

    // 2) Increment user points by 1
    await UserModel.updateOne(
      { username },
      {
        $push: { [voteType === 'upvote' ? 'questionsUpvoted' : 'questionsDownvoted']: qid },
        $inc: { points: 1 },
      },
    );

    const voterUser = await UserModel.findOne({ username });
    if (voterUser) {
      const action = voteType === 'upvote' ? 'upvoted' : 'downvoted';
      const historyEntry = `Awarded 1 point for ${action} a question at ${new Date().toLocaleString()}.`;
      await appendPointsHistory(voterUser._id.toString(), historyEntry);
    }

    // 3) Fetch the updated top 10
    const top10 = await getTop10ByPoints();
    if (Array.isArray(top10)) {
      socket.emit('top10Response', top10);
    } else {
      // Optionally: socket.emit('error', top10.error);
    }

    // 4) Build response message
    let msg = '';
    if (voteType === 'upvote') {
      msg = result.upVotes.includes(username)
        ? 'Question upvoted successfully'
        : 'Upvote cancelled successfully';
    } else {
      msg = result.downVotes.includes(username)
        ? 'Question downvoted successfully'
        : 'Downvote cancelled successfully';
    }

    return {
      msg,
      upVotes: result.upVotes || [],
      downVotes: result.downVotes || [],
    };
  } catch (err) {
    return {
      error:
        voteType === 'upvote'
          ? 'Error when adding upvote to question'
          : 'Error when adding downvote to question',
    };
  }
};
