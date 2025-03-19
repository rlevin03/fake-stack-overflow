import {
  Answer,
  AnswerResponse,
  AnswerVoteResponse,
  DatabaseAnswer,
  DatabaseQuestion,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  QuestionResponse,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import UserModel from '../models/users.model';
import { QueryOptions } from 'mongoose';

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
 * Adds a vote to a question.
 * @param {string} ansid - The question ID
 * @param {string} username - The username who voted
 * @param {'upvote' | 'downvote'} voteType - The vote type
 * @returns {Promise<AnswerVoteResponse>} - The updated vote result
 */
export const addVoteToAnswer = async (
  ansid: string,
  username: string,
  voteType: 'upvote' | 'downvote',
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
    const result: DatabaseAnswer | null = await AnswerModel.findOneAndUpdate(
      { _id: ansid },
      updateOperation,
      { new: true },
    );

    await UserModel.updateOne(
      { username },
      {
        $push: { [voteType === 'upvote' ? 'questionsUpvoted' : 'questionsDownvoted']: ansid },
        $inc: { points: 1 },
      },
    );

    if (!result) {
      return { error: 'Question not found!' };
    }

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
