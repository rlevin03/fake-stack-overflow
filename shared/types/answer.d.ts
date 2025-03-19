import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { Comment, DatabaseComment } from './comment';

/**
 * Represents an answer to a question.
 * - `text`: The answer text.
 * - `ansBy`: The author of the answer.
 * - `ansDateTime`: The timestamp of when the answer was given.
 * - `comments`: A list of comments associated with the answer.
 */
export interface Answer {
  text: string;
  ansBy: string;
  ansDateTime: Date;
  upVotes: string[];
  downVotes: string[];
  comments: Comment[];
}

/**
 * Represents an answer stored in the database.
 * - `_id`: The unique identifier of the answer.
 * - `comments`: A list of ObjectId references to the comments related to the answer.
 */
export interface DatabaseAnswer extends Omit<Answer, 'comments'> {
  _id: ObjectId;
  comments: ObjectId[];
}

/**
 * Represents a fully populated answer from the database.
 * - `comments`: A list of populated `DatabaseComment` objects.
 */
export interface PopulatedDatabaseAnswer extends Omit<DatabaseAnswer, 'comments'> {
  comments: DatabaseComment[];
}

/**
 * Interface extending the request body for adding an answer to a question.
 * - `qid`: The unique identifier of the question being answered.
 * - `ans`: The answer being added.
 */
export interface AddAnswerRequest extends Request {
  body: {
    qid: string;
    ans: Answer;
  };
}

/**
 * Type representing possible responses for an Answer-related operation.
 * - Either a `DatabaseAnswer` object or an error message.
 */
export type AnswerResponse = DatabaseAnswer | { error: string };

/**
 * Type representing an object with the vote success message, updated upVotes,
 */
export type VoteInterface = { msg: string; upVotes: string[]; downVotes: string[] };

/**
 * Type representing possible responses for a vote-related operation.
 * - Either an object with the vote success message, updated upVotes,
 *   and updated downVotes, or an error message.
 */
export type AnswerVoteResponse = VoteInterface | { error: string };

/**
 * Interface for the request body when upvoting or downvoting an Answer.
 * - `ansid`: The unique identifier of the answer being voted on (body).
 * - `username`: The username of the user casting the vote (body).
 */
export interface AnswerVoteRequest extends Request {
  body: {
    ansid: string;
    username: string;
  };
}
