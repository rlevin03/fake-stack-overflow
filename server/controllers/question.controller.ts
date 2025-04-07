import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import tagIndexMap from '@fake-stack-overflow/shared/tagIndexMap.json';
import {
  Question,
  FindQuestionRequest,
  FindQuestionByIdRequest,
  AddQuestionRequest,
  FakeSOSocket,
  PopulatedDatabaseQuestion,
  QuestionVoteRequest,
  Tag,
} from '../types/types';
import {
  addVoteToQuestion,
  fetchAndIncrementQuestionViewsById,
  filterQuestionsByAskedBy,
  filterQuestionsBySearch,
  getQuestionsByOrder,
  saveQuestion,
} from '../services/question.service';
import { processTags } from '../services/tag.service';
import { populateDocument } from '../utils/database.util';
import { updateUserPreferences } from '../services/user.service';
import { getGeminiResponse, getGeminiAutoComplete } from '../services/gemini.service';
import { saveAnswer, addAnswerToQuestion } from '../services/answer.service';
import QuestionModel from '../models/questions.model';
import UserModel from '../models/users.model';

const questionController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Retrieves a list of questions filtered by a search term and ordered by a specified criterion.
   */
  const getQuestionsByFilter = async (req: FindQuestionRequest, res: Response): Promise<void> => {
    const order = (req.query.order as string) || 'mostViewed';
    const search = (req.query.search as string) || '';
    const askedBy = req.query.askedBy as string | undefined;

    try {
      let qlist: PopulatedDatabaseQuestion[] = await getQuestionsByOrder(order);

      // Filter by askedBy if provided
      if (askedBy) {
        qlist = filterQuestionsByAskedBy(qlist, askedBy);
      }

      // Filter by search keyword and tags
      const resqlist: PopulatedDatabaseQuestion[] = filterQuestionsBySearch(qlist, search);
      res.json(resqlist);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching questions by filter: ${err.message}`);
      } else {
        res.status(500).send(`Error when fetching questions by filter`);
      }
    }
  };

  /**
   * Retrieves a question by its unique ID, and increments the view count for that question.
   */
  const getQuestionById = async (req: FindQuestionByIdRequest, res: Response): Promise<void> => {
    const { qid } = req.params;
    const username = req.query.username as string | undefined;

    if (!ObjectId.isValid(qid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    if (!username) {
      res.status(400).send('Invalid username requesting question.');
      return;
    }

    try {
      const q = await fetchAndIncrementQuestionViewsById(qid, username);

      if ('error' in q) {
        throw new Error('Error while fetching question by id');
      }

      // Update user preferences based on the question's tags for a view.
      const viewImpact = 0.1;
      const updates = q.tags
        .map(tag => {
          const tagName = tag.name as keyof typeof tagIndexMap;
          const index = tagIndexMap[tagName];
          return index !== undefined ? { index, value: viewImpact } : null;
        })
        .filter((update): update is { index: number; value: number } => update !== null);

      // Retrieve the user record for the viewer
      const userRecord = await UserModel.findOne({ username });
      if (userRecord) {
        await updateUserPreferences(userRecord._id.toString(), updates);
      }

      socket.emit('viewsUpdate', q);
      res.json(q);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching question by id: ${err.message}`);
      } else {
        res.status(500).send(`Error when fetching question by id`);
      }
    }
  };

  /**
   * Validates the question object to ensure it contains all the necessary fields.
   */
  const isQuestionBodyValid = (question: Question): boolean =>
    question.title !== undefined &&
    question.title !== '' &&
    question.text !== undefined &&
    question.text !== '' &&
    question.tags !== undefined &&
    question.tags.length > 0 &&
    question.askedBy !== undefined &&
    question.askedBy !== '' &&
    question.askDateTime !== undefined &&
    question.askDateTime !== null;

  /**
   * Adds a new question to the database.
   */
  const addQuestion = async (req: AddQuestionRequest, res: Response): Promise<void> => {
    if (!isQuestionBodyValid(req.body)) {
      res.status(400).send('Invalid question body');
      return;
    }

    const question: Question = req.body;

    try {
      // Process tags
      const questionsWithTags = {
        ...question,
        tags: await processTags(question.tags),
      };
      if (questionsWithTags.tags.length === 0) {
        throw new Error('Invalid tags');
      }

      // Save the question (and update user points/leaderboard)
      const result = await saveQuestion(questionsWithTags, socket);
      if ('error' in result) {
        throw new Error(result.error);
      }

      // Populate the newly created question
      const populatedQuestion = (await populateDocument(
        result._id.toString(),
        'question',
      )) as PopulatedDatabaseQuestion;

      if ('error' in populatedQuestion) {
        throw new Error(String(populatedQuestion.error));
      }

      // Update user preferences (+1 for each tag)
      const voteImpact = 1;
      const updates = populatedQuestion.tags
        .map((tag: Tag) => {
          const tagName = tag.name as keyof typeof tagIndexMap;
          const index = tagIndexMap[tagName];
          return index !== undefined ? { index, value: voteImpact } : null;
        })
        .filter((update): update is { index: number; value: number } => update !== null);

      const userRecord = await UserModel.findOne({ username: populatedQuestion.askedBy });
      if (userRecord) {
        await updateUserPreferences(userRecord._id.toString(), updates);
      }

      // Emit an event and send the question back in the response
      socket.emit('questionUpdate', populatedQuestion);
      res.json(populatedQuestion);

      // ----- If the user's AI toggle is on, generate an AI answer asynchronously -----
      if (userRecord && userRecord.aiToggler) {
        // 1) Extract question details
        const questionTitle = populatedQuestion.title;
        const questionDescription = populatedQuestion.text;
        const tagNames = populatedQuestion.tags.map(tg => tg.name);

        // 2) Call Gemini with title, description, and tag list
        getGeminiResponse(questionTitle, questionDescription, tagNames)
          .then(async (geminiText: string) => {
            try {
              // 3) Prepend an italicized label
              const aiAnswerText = `${geminiText}`;

              // 4) Build the new AI answer object (with all required fields)
              const aiAnswer = {
                text: aiAnswerText,
                ansBy: 'AI',
                ansDateTime: new Date(),
                upVotes: [] as string[],
                downVotes: [] as string[],
                // Possibly typed as Comment[] or any[] if needed
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                comments: [] as any[],
              };

              // 5) Save the AI-generated answer
              const savedAiAnswer = await saveAnswer(aiAnswer);
              if (!('error' in savedAiAnswer)) {
                // 6) Attach the AI answer to the question
                await addAnswerToQuestion(populatedQuestion._id.toString(), savedAiAnswer);

                // 7) Emit an event for the AI answer
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (socket as any).emit('aiAnswerUpdate', savedAiAnswer);
              }
            } catch (error) {
              console.error('Error saving AI-generated answer:', error);
            }
          })
          .catch((error: unknown) => {
            console.error('Error generating AI answer:', error);
          });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when saving question: ${err.message}`);
      } else {
        res.status(500).send(`Error when saving question`);
      }
    }
  };

  /**
   * Helper function to handle upvoting or downvoting a question.
   */
  const voteQuestion = async (
    req: QuestionVoteRequest,
    res: Response,
    type: 'upvote' | 'downvote',
  ): Promise<void> => {
    if (!req.body.qid || !req.body.username) {
      res.status(400).send('Invalid request');
      return;
    }

    const { qid, username } = req.body;

    try {
      // Register the vote and pass the socket so the service can broadcast the updated leaderboard
      const status = await addVoteToQuestion(qid, username, type, socket);
      if (status && 'error' in status) {
        throw new Error(status.error);
      }

      // Determine the vote impact: +0.5 for upvote, -0.5 for downvote
      const voteImpact = type === 'upvote' ? 0.5 : -0.5;

      // Fetch the question with its tags
      const question = await QuestionModel.findById(qid).populate<{ tags: Tag[] }>('tags');
      if (!question) {
        throw new Error('Question not found');
      }

      const updates = question.tags
        .map(tag => {
          const tagName = tag.name as keyof typeof tagIndexMap;
          const index = tagIndexMap[tagName];
          return index !== undefined ? { index, value: voteImpact } : null;
        })
        .filter((update): update is { index: number; value: number } => update !== null);
      // Fetch the user record to retrieve the user's ID
      const userRecord = await UserModel.findOne({ username });
      if (userRecord) {
        await updateUserPreferences(userRecord._id.toString(), updates);
      }

      // Emit the updated vote counts to all connected clients
      socket.emit('voteUpdate', { qid, upVotes: status.upVotes, downVotes: status.downVotes });
      res.json(status);
    } catch (err) {
      res.status(500).send(`Error when ${type}ing: ${(err as Error).message}`);
    }
  };

  /**
   * Handles upvoting a question.
   */
  const upvoteQuestion = async (req: QuestionVoteRequest, res: Response): Promise<void> => {
    voteQuestion(req, res, 'upvote');
  };

  /**
   * Handles downvoting a question.
   */
  const downvoteQuestion = async (req: QuestionVoteRequest, res: Response): Promise<void> => {
    voteQuestion(req, res, 'downvote');
  };

  // Define endpoints with appropriate HTTP verbs
  router.get('/getQuestion', getQuestionsByFilter);
  router.get('/getQuestionById/:qid', getQuestionById);
  router.post('/addQuestion', addQuestion);
  router.post('/upvoteQuestion', upvoteQuestion);
  router.post('/downvoteQuestion', downvoteQuestion);

  return router;
};

export default questionController;
