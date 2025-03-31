import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import tagIndexMap from '../../shared/tagIndexMap.json';

import { addAnswerToQuestion, addVoteToAnswer, saveAnswer } from '../services/answer.service';
import { populateDocument } from '../utils/database.util';
import QuestionModel from '../models/questions.model';
import UserModel from '../models/users.model';
import { updateUserPreferences } from '../services/user.service';
import AnswerModel from '../models/answers.model';
import {
  AddAnswerRequest,
  Answer,
  AnswerVoteRequest,
  FakeSOSocket,
  PopulatedDatabaseAnswer,
  Tag,
} from '../types/types';
import { awardingBadgeHelper } from '../utils/badge.util';
import { BadgeName, BadgeDescription } from '../../shared/types/badge';

const answerController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Checks if the provided answer request contains the required fields.
   *
   * @param req The request object containing the answer data.
   *
   * @returns `true` if the request is valid, otherwise `false`.
   */
  function isRequestValid(req: AddAnswerRequest): boolean {
    return !!req.body.qid && !!req.body.ans;
  }

  /**
   * Checks if the provided answer contains the required fields.
   *
   * @param ans The answer object to validate.
   *
   * @returns `true` if the answer is valid, otherwise `false`.
   */
  function isAnswerValid(ans: Answer): boolean {
    return !!ans.text && !!ans.ansBy && !!ans.ansDateTime;
  }

  /**
   * Adds a new answer to a question in the database. The answer request and answer are
   * validated and then saved. If successful, the answer is associated with the corresponding
   * question. If there is an error, the HTTP response's status is updated.
   *
   * @param req The AnswerRequest object containing the question ID and answer data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const addAnswer = async (req: AddAnswerRequest, res: Response): Promise<void> => {
    if (!isRequestValid(req)) {
      res.status(400).send('Invalid request');
      return;
    }
    if (!isAnswerValid(req.body.ans)) {
      res.status(400).send('Invalid answer');
      return;
    }

    const { qid } = req.body;
    const ansInfo: Answer = req.body.ans;

    try {
      const ansFromDb = await saveAnswer(ansInfo);

      if ('error' in ansFromDb) {
        throw new Error(ansFromDb.error as string);
      }

      const status = await addAnswerToQuestion(qid, ansFromDb);

      if (status && 'error' in status) {
        throw new Error(status.error as string);
      }

      const populatedAns = await populateDocument(ansFromDb._id.toString(), 'answer');

      if (populatedAns && 'error' in populatedAns) {
        throw new Error(populatedAns.error);
      }

      // --- Begin: Update user preferences for answering ---
      // For each tag in the question, add +1 to the corresponding index.
      const voteImpact = 1;
      // Fetch the question to retrieve its tags
      const question = await QuestionModel.findById(qid).populate<{ tags: Tag[] }>('tags');
      if (!question) {
        console.error('Question not found while updating preferences for answer.');
      } else {
        const updates = question.tags
          .map(tag => {
            const tagName = tag.name as keyof typeof tagIndexMap;
            const index = tagIndexMap[tagName];
            return index !== undefined ? { index, value: voteImpact } : null;
          })
          .filter((update): update is { index: number; value: number } => update !== null);

        // Fetch the user record of the answerer (ansBy)
        const userRecord = await UserModel.findOne({ username: ansInfo.ansBy });
        if (userRecord) {
          await updateUserPreferences(userRecord._id.toString(), updates);
        }
      }
      // --- End: Update user preferences for answering ---

      // --- Begin: Update the helping hand badge progress ---
      // create a badge if there isnt one
      await awardingBadgeHelper(
        ansInfo.ansBy,
        BadgeName.HELPING_HAND,
        BadgeDescription.HELPING_HAND,
      );

      // --- End: Update the helping hand badge progress ---

      //Begin: Update the lifelife badge progress
      if (
        question &&
        question.askDateTime &&
        ansInfo.ansDateTime &&
        question.askDateTime.getTime() - ansInfo.ansDateTime.getTime() > 24 * 60 * 60 * 1000
      ) {
        await awardingBadgeHelper(ansInfo.ansBy, BadgeName.LIFELINE, BadgeDescription.LIFELINE);
      }

      //End: Update the lifelife badge progress

      //Begin: Update the lightning responder badge progress
      if (
        question &&
        question.askDateTime &&
        ansInfo.ansDateTime &&
        ansInfo.ansDateTime.getTime() - question.askDateTime.getTime() < 5 * 60 * 1000
      ) {
        await awardingBadgeHelper(
          ansInfo.ansBy,
          BadgeName.LIGHTNING_RESPONDER,
          BadgeDescription.LIGHTNING_RESPONDER,
        );
      }
      //End: Update the lightning responder badge progress

      // Populates the fields of the answer that was added and emits the new object
      socket.emit('answerUpdate', {
        qid: new ObjectId(qid),
        answer: populatedAns as PopulatedDatabaseAnswer,
      });
      res.json(ansFromDb);
    } catch (err) {
      res.status(500).send(`Error when adding answer: ${(err as Error).message}`);
    }
  };

  /**
   * Helper function to handle upvoting or downvoting an answer.
   *
   * @param req The VoteRequest object containing the answer ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   * @param type The type of vote to perform (upvote or downvote).
   *
   * @returns A Promise that resolves to void.
   */
  const voteAnswer = async (
    req: AnswerVoteRequest,
    res: Response,
    type: 'upvote' | 'downvote',
  ): Promise<void> => {
    if (!req.body.ansid || !req.body.username) {
      res.status(400).send('Invalid request');
      return;
    }

    const { ansid, username } = req.body;

    try {
      let status;

      if (type === 'upvote') {
        status = await addVoteToAnswer(ansid, username, type);
        await awardingBadgeHelper(
          username,
          BadgeName.RESPECTED_VOICE,
          BadgeDescription.RESPECTED_VOICE,
        );
        const answer = await AnswerModel.findById(ansid);
        if (!answer) {
          throw new Error('Answer not found');
        }
        const user = await UserModel.findOne({ username });
        if (!user) {
          throw new Error('User not found');
        }
        // find the answer with 50 or more upvotes and award the badge
        if ((answer?.upVotes?.length ?? 0) >= 50) {
          await awardingBadgeHelper(
            user.username,
            BadgeName.PEOPLES_CHAMPION,
            BadgeDescription.PEOPLES_CHAMPION,
          );
        }
      } else {
        status = await addVoteToAnswer(ansid, username, type);
      }

      if (status && 'error' in status) {
        throw new Error(status.error);
      }

      // Emit the updated vote counts to all connected clients
      socket.emit('voteUpdate', {
        qid: ansid,
        upVotes: status.upVotes,
        downVotes: status.downVotes,
      });
      res.json(status);
    } catch (err) {
      res.status(500).send(`Error when ${type}ing: ${(err as Error).message}`);
    }
  };

  /**
   * Handles upvoting an answer. The request must contain the answerr ID (ansid) and the username.
   * If the request is invalid or an error occurs, the appropriate HTTP response status and message are returned.
   *
   * @param req The VoteRequest object containing the answer ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const upvoteAnswer = async (req: AnswerVoteRequest, res: Response): Promise<void> => {
    voteAnswer(req, res, 'upvote');
  };

  /**
   * Handles downvoting an answer. The request must contain the answer ID (ansid) and the username.
   * If the request is invalid or an error occurs, the appropriate HTTP response status and message are returned.
   *
   * @param req The VoteRequest object containing the answer ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const downvoteAnswer = async (req: AnswerVoteRequest, res: Response): Promise<void> => {
    voteAnswer(req, res, 'downvote');
  };

  // add appropriate HTTP verbs and their endpoints to the router.
  router.post('/addAnswer', addAnswer);
  router.post('/upvoteAnswer', upvoteAnswer);
  router.post('/downvoteAnswer', downvoteAnswer);

  return router;
};

export default answerController;
