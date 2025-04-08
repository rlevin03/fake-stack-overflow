import { QueryOptions } from 'mongoose';
import {
  Answer,
  AnswerResponse,
  AnswerVoteResponse,
  DatabaseAnswer,
  DatabaseQuestion,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  QuestionResponse,
  FakeSOSocket,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import UserModel from '../models/users.model';
import { getTop10ByPoints, appendPointsHistory } from './user.service';

/**
 * Records the most recent answer time for a given question based on its answers.
 *
 * @param {PopulatedDatabaseQuestion} question - The question containing answers to check.
 * @param {Map<string, Date>} mp - A map storing the most recent answer time for each question.
 */
export const getMostRecentAnswerTime = (
  question: PopulatedDatabaseQuestion,
  mp: Map<string, Date>,
): void => {
  question.answers.forEach((answer: PopulatedDatabaseAnswer) => {
    const currentMostRecent = mp.get(question._id.toString());
    if (!currentMostRecent || currentMostRecent < answer.ansDateTime) {
      mp.set(question._id.toString(), answer.ansDateTime);
    }
  });
};

/**
 * Saves a new answer to the database.
 *
 * @param {Answer} answer - The answer object to be saved.
 * @returns {Promise<AnswerResponse>} - A promise resolving to the saved answer or an error message.
 */
export const saveAnswer = async (answer: Answer): Promise<AnswerResponse> => {
  try {
    const result: DatabaseAnswer = await AnswerModel.create(answer);
    await UserModel.updateOne(
      { username: answer.ansBy },
      { $push: { questionsAnswered: result._id }, $inc: { points: 5 } },
    );
    const userRecord = await UserModel.findOne({ username: answer.ansBy });
    if (userRecord) {
      const historyEntry = `Awarded 5 points for posting an answer at ${new Date().toLocaleString()}`;
      await appendPointsHistory(userRecord._id.toString(), historyEntry);
    }
    return result;
  } catch (error) {
    return { error: 'Error when saving an answer' };
  }
};

/**
 * Adds an existing answer to a specified question in the database.
 *
 * @param {string} ansid - The ID of the question to which the answer will be added.
 * @param {DatabaseAnswer} ans - The answer to associate with the question.
 * @returns {Promise<QuestionResponse>} - A promise resolving to the updated question or an error message.
 */
export const addAnswerToQuestion = async (
  ansid: string,
  ans: DatabaseAnswer,
): Promise<QuestionResponse> => {
  try {
    if (!ans || !ans.text || !ans.ansBy || !ans.ansDateTime) {
      throw new Error('Invalid answer');
    }

    const result: DatabaseQuestion | null = await QuestionModel.findOneAndUpdate(
      { _id: ansid },
      { $push: { answers: { $each: [ans._id], $position: 0 } } },
      { new: true },
    );

    if (result === null) {
      throw new Error('Error when adding answer to question');
    }
    return result;
  } catch (error) {
    return { error: 'Error when adding answer to question' };
  }
};

/**
 * Adds a vote to an answer, increments user points by 1,
 * and broadcasts an updated top 10 leaderboard to all clients.
 *
 * @param {string} ansid - The answer ID
 * @param {string} username - The username who voted
 * @param {'upvote' | 'downvote'} voteType - The vote type
 * @param {FakeSOSocket} socket - The socket instance for broadcasting
 * @returns {Promise<AnswerVoteResponse>} - The updated vote result
 */
export const addVoteToAnswer = async (
  ansid: string,
  username: string,
  voteType: 'upvote' | 'downvote',
  socket: FakeSOSocket,
): Promise<AnswerVoteResponse> => {
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
    // 1) Update the answer's upVotes/downVotes
    const result: DatabaseAnswer | null = await AnswerModel.findOneAndUpdate(
      { _id: ansid },
      updateOperation,
      { new: true },
    );

    if (!result) {
      return { error: 'Answer not found!' };
    }

    // 2) Increment user points by 1
    await UserModel.updateOne(
      { username },
      {
        $push: { [voteType === 'upvote' ? 'answersUpvoted' : 'answersDownvoted']: ansid },
        $inc: { points: 1 },
      },
    );

    const voterUser = await UserModel.findOne({ username });
    if (voterUser) {
      const action = voteType === 'upvote' ? 'upvoted' : 'downvoted';
      const historyEntry = `Awarded 1 point for ${action} an answer at ${new Date().toLocaleString()}.`;
      await appendPointsHistory(voterUser._id.toString(), historyEntry);
    }

    // 3) Fetch and broadcast the updated top 10 if socket is provided
    if (socket) {
      const top10 = await getTop10ByPoints();
      if (Array.isArray(top10)) {
        socket.emit('top10Response', top10);
      } else {
        /* empty */
      }
    }

    // 4) Build response message
    let msg = '';
    if (voteType === 'upvote') {
      msg = result.upVotes.includes(username)
        ? 'Answer upvoted successfully'
        : 'Upvote cancelled successfully';
    } else {
      msg = result.downVotes.includes(username)
        ? 'Answer downvoted successfully'
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
          ? 'Error when adding upvote to answer'
          : 'Error when adding downvote to answer',
    };
  }
};
