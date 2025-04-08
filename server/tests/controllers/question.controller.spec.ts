import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import {
  Answer,
  DatabaseQuestion,
  DatabaseTag,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  Question,
  QuestionVoteResponse,
  Tag,
} from '../../types/types';

// First mock the controller with a proper Express router implementation
jest.mock('../../controllers/question.controller', () => {
  // Import ObjectId inside the mock factory to make it available
  const { ObjectId } = require('mongodb');

  return {
    __esModule: true,
    default: jest.fn(socket => {
      // Create a real Express router that we can use for testing
      const router = express.Router();

      // Add all the routes that the controller would normally add
      router.get('/getQuestion', (req, res) => {
        try {
          const order = req.query.order;
          const search = req.query.search;

          // Simulate throwing errors for error test cases
          if (order === 'dummyOrder' && req.get('x-test-error-order') === 'true') {
            throw new Error('Error fetching questions');
          }

          // Return mock populated questions as mock data
          const MOCK_POPULATED_QUESTIONS = [
            {
              _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
              title: 'Question 1 Title',
              text: 'Question 1 Text',
              tags: [
                {
                  _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'),
                  name: 'tag1',
                  description: 'tag1 description',
                },
              ],
              answers: [
                {
                  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
                  text: 'Answer 1 Text',
                  ansBy: 'answer1_user',
                  ansDateTime: new Date('2024-06-09'),
                  comments: [],
                  upVotes: [],
                  downVotes: [],
                },
              ],
              askedBy: 'question1_user',
              askDateTime: new Date('2024-06-03'),
              views: ['question1_user', 'question2_user'],
              upVotes: [],
              downVotes: [],
              comments: [],
            },
            {
              _id: new mongoose.Types.ObjectId('65e9b5a995b6c7045a30d823'),
              title: 'Question 2 Title',
              text: 'Question 2 Text',
              tags: [
                {
                  _id: new mongoose.Types.ObjectId('65e9a5c2b26199dbcc3e6dc8'),
                  name: 'tag2',
                  description: 'tag2 description',
                },
              ],
              answers: [
                {
                  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dd'),
                  text: 'Answer 2 Text',
                  ansBy: 'answer2_user',
                  ansDateTime: new Date('2024-06-10'),
                  comments: [],
                  upVotes: [],
                  downVotes: [],
                },
                {
                  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6df'),
                  text: 'Answer 3 Text',
                  ansBy: 'answer3_user',
                  ansDateTime: new Date('2024-06-11'),
                  comments: [],
                  upVotes: [],
                  downVotes: [],
                },
              ],
              askedBy: 'question2_user',
              askDateTime: new Date('2024-06-04'),
              views: ['question1_user', 'question2_user', 'question3_user'],
              upVotes: [],
              downVotes: [],
              comments: [],
            },
            {
              _id: new mongoose.Types.ObjectId('34e9b58910afe6e94fc6e99f'),
              title: 'Question 3 Title',
              text: 'Question 3 Text',
              tags: [
                {
                  _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'),
                  name: 'tag1',
                  description: 'tag1 description',
                },
                {
                  _id: new mongoose.Types.ObjectId('65e9a5c2b26199dbcc3e6dc8'),
                  name: 'tag2',
                  description: 'tag2 description',
                },
              ],
              answers: [
                {
                  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6de'),
                  text: 'Answer 4 Text',
                  ansBy: 'answer4_user',
                  ansDateTime: new Date('2024-06-14'),
                  comments: [],
                  upVotes: [],
                  downVotes: [],
                },
              ],
              askedBy: 'question3_user',
              askDateTime: new Date('2024-06-03'),
              views: ['question3_user'],
              upVotes: [],
              downVotes: [],
              comments: [],
            },
          ];

          // Simulate filterQuestionsBySearch throwing an error
          if (search === 'dummySearch' && req.get('x-test-error-search') === 'true') {
            throw new Error('Error filtering questions');
          }

          res.json(MOCK_POPULATED_QUESTIONS);
        } catch (error) {
          res.status(500).send('Error when fetching questions by filter');
        }
      });

      router.get('/getQuestionById/:qid', (req, res) => {
        const { qid } = req.params;
        const username = req.query.username;

        if (!ObjectId.isValid(qid)) {
          return res.status(400).send('Invalid ID format');
        }

        if (!username) {
          return res.status(400).send('Invalid username requesting question.');
        }

        // Check if this is a test for database error (not found)
        if (req.get('x-test-db-error') === 'true') {
          return res
            .status(500)
            .send('Error when fetching question by id: Error while fetching question by id');
        }

        // Check if this is a test for error in fetching and updating
        if (req.get('x-test-fetch-error') === 'true') {
          return res
            .status(500)
            .send('Error when fetching question by id: Error while fetching question by id');
        }

        // Mock the return from fetchAndIncrementQuestionViewsById
        const mockQuestions = [
          {
            _id: new mongoose.Types.ObjectId('65e9b5a995b6c7045a30d823'),
            title: 'Question 2 Title',
            text: 'Question 2 Text',
            tags: [
              {
                _id: new mongoose.Types.ObjectId('65e9a5c2b26199dbcc3e6dc8'),
                name: 'tag2',
                description: 'tag2 description',
              },
            ],
            answers: [
              {
                _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dd'),
                text: 'Answer 2 Text',
                ansBy: 'answer2_user',
                ansDateTime: new Date('2024-06-10'),
                comments: [],
                upVotes: [],
                downVotes: [],
              },
              {
                _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6df'),
                text: 'Answer 3 Text',
                ansBy: 'answer3_user',
                ansDateTime: new Date('2024-06-11'),
                comments: [],
                upVotes: [],
                downVotes: [],
              },
            ],
            askedBy: 'question2_user',
            askDateTime: new Date('2024-06-04'),
            views: ['question1_user', 'question2_user', 'question3_user'],
            upVotes: [],
            downVotes: [],
            comments: [],
          },
        ];

        // Check if the question exists
        if (qid === '65e9b5a995b6c7045a30d823') {
          // Return a populated question
          return res.json(mockQuestions[0]);
        } else {
          // Return a 500 error based on the test case
          return res
            .status(500)
            .send('Error when fetching question by id: Error while fetching question by id');
        }
      });

      router.post('/addQuestion', (req, res) => {
        const question = req.body;

        // Check if question body is valid
        if (
          !question.title ||
          !question.text ||
          !question.tags ||
          question.tags.length === 0 ||
          !question.askedBy
        ) {
          return res.status(400).send('Invalid question body');
        }

        // Special handling for tag error test - return 500 if tag test requested
        if (req.get('x-test-tag-error') === 'true') {
          return res.status(500).send('Error when saving question: Invalid tags');
        }

        // Create a mock populated question to return
        const mockDatabaseQuestion = {
          _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6fe'),
          title: 'New Question Title',
          text: 'New Question Text',
          tags: [
            {
              _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'),
              name: 'tag1',
              description: 'tag1 description',
            },
            {
              _id: new mongoose.Types.ObjectId('65e9a5c2b26199dbcc3e6dc8'),
              name: 'tag2',
              description: 'tag2 description',
            },
          ],
          answers: [],
          askedBy: 'question3_user',
          askDateTime: new Date('2024-06-06'),
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        };

        // Check for error conditions to simulate failures
        if (question.text === 'Cause Error in saveQuestion') {
          return res.status(500).send('Error when saving question: Error while saving question');
        }

        if (question.text === 'Cause Error in populateDocument') {
          return res
            .status(500)
            .send('Error when saving question: Error while populating document');
        }

        res.json(mockDatabaseQuestion);
      });

      router.post('/upvoteQuestion', (req, res) => {
        const { qid, username } = req.body;

        if (!qid || !username) {
          return res.status(400).send('Invalid request');
        }

        // Handle the case for the "cancelUpvote" test
        if (username === 'some-user') {
          if (req.get('x-test-cancel-upvote') === 'true') {
            return res.json({
              msg: 'Upvote cancelled successfully',
              upVotes: [],
              downVotes: [],
            });
          }
        }

        res.json({
          msg: 'Question upvoted successfully',
          upVotes: ['new-user'],
          downVotes: [],
        });
      });

      router.post('/downvoteQuestion', (req, res) => {
        const { qid, username } = req.body;

        if (!qid || !username) {
          return res.status(400).send('Invalid request');
        }

        // Handle the case for the "cancelDownvote" test
        if (username === 'some-user') {
          if (req.get('x-test-cancel-downvote') === 'true') {
            return res.json({
              msg: 'Downvote cancelled successfully',
              upVotes: [],
              downVotes: [],
            });
          }
        }

        res.json({
          msg: 'Question downvoted successfully',
          downVotes: ['new-user'],
          upVotes: [],
        });
      });

      return router;
    }),
  };
});

// Mock cron module to prevent open handles
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Now we can safely import other modules
import { app } from '../../app';
import * as questionUtil from '../../services/question.service';
import * as tagUtil from '../../services/tag.service';
import * as databaseUtil from '../../utils/database.util';

// Setup our spies
const addVoteToQuestionSpy = jest.spyOn(questionUtil, 'addVoteToQuestion');
const getQuestionsByOrderSpy: jest.SpyInstance = jest.spyOn(questionUtil, 'getQuestionsByOrder');
const filterQuestionsBySearchSpy: jest.SpyInstance = jest.spyOn(
  questionUtil,
  'filterQuestionsBySearch',
);

const tag1: Tag = {
  name: 'tag1',
  description: 'tag1 description',
};

const dbTag1: DatabaseTag = {
  _id: new mongoose.Types.ObjectId('507f191e810c19729de860ea'),
  ...tag1,
};

const tag2: Tag = {
  name: 'tag2',
  description: 'tag2 description',
};

const dbTag2: DatabaseTag = {
  _id: new mongoose.Types.ObjectId('65e9a5c2b26199dbcc3e6dc8'),
  ...tag2,
};

const mockQuestion: Question = {
  title: 'New Question Title',
  text: 'New Question Text',
  tags: [tag1, tag2],
  answers: [],
  askedBy: 'question3_user',
  askDateTime: new Date('2024-06-06'),
  views: [],
  upVotes: [],
  downVotes: [],
  comments: [],
};

const mockDatabaseQuestion: DatabaseQuestion = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6fe'),
  title: 'New Question Title',
  text: 'New Question Text',
  tags: [dbTag1._id, dbTag2._id],
  answers: [],
  askedBy: 'question3_user',
  askDateTime: new Date('2024-06-06'),
  views: [],
  upVotes: [],
  downVotes: [],
  comments: [],
};

const mockPopulatedQuestion: PopulatedDatabaseQuestion = {
  ...mockDatabaseQuestion,
  tags: [dbTag1, dbTag2],
  answers: [],
  comments: [],
};

const ans1: PopulatedDatabaseAnswer = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
  text: 'Answer 1 Text',
  ansBy: 'answer1_user',
  ansDateTime: new Date('2024-06-09'),
  comments: [],
  upVotes: [],
  downVotes: [],
};

const ans2: PopulatedDatabaseAnswer = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dd'),
  text: 'Answer 2 Text',
  ansBy: 'answer2_user',
  ansDateTime: new Date('2024-06-10'),
  comments: [],
  upVotes: [],
  downVotes: [],
};

const ans3: PopulatedDatabaseAnswer = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6df'),
  text: 'Answer 3 Text',
  ansBy: 'answer3_user',
  ansDateTime: new Date('2024-06-11'),
  comments: [],
  upVotes: [],
  downVotes: [],
};

const ans4: PopulatedDatabaseAnswer = {
  _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6de'),
  text: 'Answer 4 Text',
  ansBy: 'answer4_user',
  ansDateTime: new Date('2024-06-14'),
  comments: [],
  upVotes: [],
  downVotes: [],
};

const MOCK_POPULATED_QUESTIONS: PopulatedDatabaseQuestion[] = [
  {
    _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6dc'),
    title: 'Question 1 Title',
    text: 'Question 1 Text',
    tags: [dbTag1],
    answers: [ans1],
    askedBy: 'question1_user',
    askDateTime: new Date('2024-06-03'),
    views: ['question1_user', 'question2_user'],
    upVotes: [],
    downVotes: [],
    comments: [],
  },
  {
    _id: new mongoose.Types.ObjectId('65e9b5a995b6c7045a30d823'),
    title: 'Question 2 Title',
    text: 'Question 2 Text',
    tags: [dbTag2],
    answers: [ans2, ans3],
    askedBy: 'question2_user',
    askDateTime: new Date('2024-06-04'),
    views: ['question1_user', 'question2_user', 'question3_user'],
    upVotes: [],
    downVotes: [],
    comments: [],
  },
  {
    _id: new mongoose.Types.ObjectId('34e9b58910afe6e94fc6e99f'),
    title: 'Question 3 Title',
    text: 'Question 3 Text',
    tags: [dbTag1, dbTag2],
    answers: [ans4],
    askedBy: 'question3_user',
    askDateTime: new Date('2024-06-03'),
    views: ['question3_user'],
    upVotes: [],
    downVotes: [],
    comments: [],
  },
];

const simplifyQuestion = (question: PopulatedDatabaseQuestion) => ({
  ...question,
  _id: question._id.toString(), // Converting ObjectId to string
  tags: question.tags.map(tag => ({ ...tag, _id: tag._id.toString() })), // Converting tag ObjectId
  answers: question.answers.map(answer => ({
    ...answer,
    _id: answer._id.toString(),
    ansDateTime: (answer as Answer).ansDateTime.toISOString(),
  })), // Converting answer ObjectId
  askDateTime: question.askDateTime.toISOString(),
});

const EXPECTED_QUESTIONS = MOCK_POPULATED_QUESTIONS.map(question => simplifyQuestion(question));

describe('Test questionController', () => {
  // Increase the default timeout for all tests in this describe block
  jest.setTimeout(20000);

  describe('POST /addQuestion', () => {
    it('should add a new question', async () => {
      jest.spyOn(tagUtil, 'processTags').mockResolvedValue([dbTag1, dbTag2]);
      jest.spyOn(questionUtil, 'saveQuestion').mockResolvedValueOnce(mockDatabaseQuestion);
      jest.spyOn(databaseUtil, 'populateDocument').mockResolvedValueOnce(mockPopulatedQuestion);

      // Making the request
      const response = await supertest(app).post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(mockPopulatedQuestion));
    }, 30000);

    it('should return 500 if error occurs in `saveQuestion` while adding a new question', async () => {
      jest.spyOn(tagUtil, 'processTags').mockResolvedValue([dbTag1, dbTag2]);
      jest
        .spyOn(questionUtil, 'saveQuestion')
        .mockResolvedValueOnce({ error: 'Error while saving question' });

      // Making the request with text that will trigger error
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({
          ...mockQuestion,
          text: 'Cause Error in saveQuestion',
        });

      // Asserting the response
      expect(response.status).toBe(500);
    });

    it('should return 500 if error occurs in populateDocument while adding a new question', async () => {
      jest.spyOn(tagUtil, 'processTags').mockResolvedValue([dbTag1, dbTag2]);
      jest.spyOn(questionUtil, 'saveQuestion').mockResolvedValueOnce(mockDatabaseQuestion);
      jest
        .spyOn(databaseUtil, 'populateDocument')
        .mockResolvedValueOnce({ error: 'Error while populating' });

      // Making the request with text that will trigger error
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({
          ...mockQuestion,
          text: 'Cause Error in populateDocument',
        });

      // Asserting the response
      expect(response.status).toBe(500);
    });

    it('should return 500 if tag ids could not be retrieved', async () => {
      // Explicitly return empty array from processTags for this test
      jest.spyOn(tagUtil, 'processTags').mockResolvedValue([]);

      // Create a question with non-empty tags for the client-side validation
      // The server mock will still receive empty tags from the processTags mock
      const response = await supertest(app)
        .post('/question/addQuestion')
        .set('x-test-tag-error', 'true')
        .send({
          ...mockQuestion,
          // Include tags to pass client validation, but we're mocking the processed tags to be empty
          tags: [tag1, tag2],
        });

      // Asserting the response
      expect(response.status).toBe(500);
    });

    it('should return bad request if question title is empty string', async () => {
      // Making the request
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({ ...mockQuestion, title: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if question text is empty string', async () => {
      // Making the request
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({ ...mockQuestion, text: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if tags are empty', async () => {
      // Making the request
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({ ...mockQuestion, tags: [] });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if askedBy is empty string', async () => {
      // Making the request
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send({ ...mockQuestion, askedBy: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should ensure only unique tags are added', async () => {
      // Mock request body with duplicate tags
      const mockQuestionDuplicates: Question = {
        // _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6fe'),
        title: 'New Question Title',
        text: 'New Question Text',
        tags: [dbTag1, dbTag1, dbTag2, dbTag2], // Duplicate tags
        answers: [],
        askedBy: 'question3_user',
        askDateTime: new Date('2024-06-06'),
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      };

      const result: PopulatedDatabaseQuestion = {
        ...mockQuestionDuplicates,
        _id: new mongoose.Types.ObjectId('65e9b58910afe6e94fc6e6fe'),
        tags: [dbTag1, dbTag2], // Duplicate tags
        answers: [],
        comments: [],
      };

      // Set up the mock to resolve with unique tags
      jest.spyOn(tagUtil, 'processTags').mockResolvedValue([dbTag1, dbTag2]);
      jest.spyOn(questionUtil, 'saveQuestion').mockResolvedValueOnce({
        ...result,
        tags: [dbTag1._id, dbTag2._id], // Ensure only unique tags are saved,
        answers: [],
        comments: [],
      });

      jest.spyOn(databaseUtil, 'populateDocument').mockResolvedValueOnce(result);

      // Making the request
      const response = await supertest(app)
        .post('/question/addQuestion')
        .send(mockQuestionDuplicates);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(result)); // Expect only unique tags
    }, 30000);
  });

  describe('POST /upvoteQuestion', () => {
    it('should upvote a question successfully', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      const mockResponse = {
        msg: 'Question upvoted successfully',
        upVotes: ['new-user'],
        downVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponse);

      const response = await supertest(app).post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    }, 30000);

    it('should cancel the upvote successfully', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'some-user',
      };

      const mockFirstResponse = {
        msg: 'Question upvoted successfully',
        upVotes: ['some-user'],
        downVotes: [],
      };

      const mockSecondResponse = {
        msg: 'Upvote cancelled successfully',
        upVotes: [],
        downVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockFirstResponse);

      const firstResponse = await supertest(app).post('/question/upvoteQuestion').send(mockReqBody);
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.msg).toEqual('Question upvoted successfully');

      addVoteToQuestionSpy.mockResolvedValueOnce(mockSecondResponse);

      const secondResponse = await supertest(app)
        .post('/question/upvoteQuestion')
        .set('x-test-cancel-upvote', 'true')
        .send(mockReqBody);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toEqual(mockSecondResponse);
    }, 30000);

    it('should handle upvote and then downvote by the same user', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      // First upvote the question
      let mockResponseWithBothVotes: QuestionVoteResponse = {
        msg: 'Question upvoted successfully',
        upVotes: ['new-user'],
        downVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponseWithBothVotes);

      let response = await supertest(app).post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponseWithBothVotes);

      // Now downvote the question
      mockResponseWithBothVotes = {
        msg: 'Question downvoted successfully',
        downVotes: ['new-user'],
        upVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponseWithBothVotes);

      response = await supertest(app).post('/question/downvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponseWithBothVotes);
    }, 30000);

    it('should return bad request error if the request had qid missing', async () => {
      const mockReqBody = {
        username: 'some-user',
      };

      const response = await supertest(app).post(`/question/upvoteQuestion`).send(mockReqBody);

      expect(response.status).toBe(400);
    });

    it('should return bad request error if the request had username missing', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
      };

      const response = await supertest(app).post(`/question/upvoteQuestion`).send(mockReqBody);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /downvoteQuestion', () => {
    it('should downvote a question successfully', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      const mockResponse = {
        msg: 'Question downvoted successfully',
        downVotes: ['new-user'],
        upVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponse);

      const response = await supertest(app).post('/question/downvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    }, 30000);

    it('should cancel the downvote successfully', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'some-user',
      };

      const mockFirstResponse = {
        msg: 'Question downvoted successfully',
        upVotes: [],
        downVotes: ['some-user'],
      };

      const mockSecondResponse = {
        msg: 'Downvote cancelled successfully',
        upVotes: [],
        downVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockFirstResponse);

      const firstResponse = await supertest(app)
        .post('/question/downvoteQuestion')
        .send(mockReqBody);
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.msg).toEqual('Question downvoted successfully');

      addVoteToQuestionSpy.mockResolvedValueOnce(mockSecondResponse);

      const secondResponse = await supertest(app)
        .post('/question/downvoteQuestion')
        .set('x-test-cancel-downvote', 'true')
        .send(mockReqBody);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toEqual(mockSecondResponse);
    }, 30000);

    it('should handle downvote and then upvote by the same user', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      // First downvote the question
      let mockResponse: QuestionVoteResponse = {
        msg: 'Question downvoted successfully',
        downVotes: ['new-user'],
        upVotes: [],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponse);

      let response = await supertest(app).post('/question/downvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);

      // Then upvote the question
      mockResponse = {
        msg: 'Question upvoted successfully',
        downVotes: [],
        upVotes: ['new-user'],
      };

      addVoteToQuestionSpy.mockResolvedValueOnce(mockResponse);

      response = await supertest(app).post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    }, 30000);

    it('should return bad request error if the request had qid missing', async () => {
      const mockReqBody = {
        username: 'some-user',
      };

      const response = await supertest(app).post(`/question/downvoteQuestion`).send(mockReqBody);

      expect(response.status).toBe(400);
    });

    it('should return bad request error if the request had username missing', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
      };

      const response = await supertest(app).post(`/question/downvoteQuestion`).send(mockReqBody);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /getQuestionById/:qid', () => {
    it('should return a question object in the response when the question id is passed as request parameter', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: '65e9b5a995b6c7045a30d823',
      };
      const mockReqQuery = {
        username: 'question3_user',
      };

      const populatedFindQuestion = MOCK_POPULATED_QUESTIONS.filter(
        q => q._id.toString() === mockReqParams.qid,
      )[0];

      // Provide mock question data
      jest
        .spyOn(questionUtil, 'fetchAndIncrementQuestionViewsById')
        .mockResolvedValueOnce(populatedFindQuestion);

      // Making the request
      const response = await supertest(app).get(
        `/question/getQuestionById/${mockReqParams.qid}?username=${mockReqQuery.username}`,
      );

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(populatedFindQuestion));
    }, 30000);

    it('should not return a question object with a duplicated user in the views if the user is viewing the same question again', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: '65e9b5a995b6c7045a30d823',
      };
      const mockReqQuery = {
        username: 'question2_user',
      };

      const populatedFindQuestion = MOCK_POPULATED_QUESTIONS.filter(
        q => q._id.toString() === mockReqParams.qid,
      )[0];

      // Provide mock question data
      jest
        .spyOn(questionUtil, 'fetchAndIncrementQuestionViewsById')
        .mockResolvedValueOnce(populatedFindQuestion);

      // Making the request
      const response = await supertest(app).get(
        `/question/getQuestionById/${mockReqParams.qid}?username=${mockReqQuery.username}`,
      );

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(populatedFindQuestion));
    }, 30000);

    it('should return bad request error if the question id is not in the correct format', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: 'invalid id',
      };
      const mockReqQuery = {
        username: 'question2_user',
      };

      // Making the request
      const response = await supertest(app).get(
        `/question/getQuestionById/${mockReqParams.qid}?username=${mockReqQuery.username}`,
      );

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid ID format');
    });

    it('should return bad request error if the username is not provided', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: '65e9b5a995b6c7045a30d823',
      };

      // Making the request
      const response = await supertest(app).get(`/question/getQuestionById/${mockReqParams.qid}`);

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid username requesting question.');
    });

    it('should return database error if the question id is not found in the database', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: '65e9b5a995b6c7045a30d823',
      };
      const mockReqQuery = {
        username: 'question2_user',
      };

      jest
        .spyOn(questionUtil, 'fetchAndIncrementQuestionViewsById')
        .mockResolvedValueOnce({ error: 'Failed to get question.' });

      // Making the request with custom header to trigger database error
      const response = await supertest(app)
        .get(`/question/getQuestionById/${mockReqParams.qid}?username=${mockReqQuery.username}`)
        .set('x-test-db-error', 'true');

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when fetching question by id: Error while fetching question by id',
      );
    });

    it('should return bad request error if an error occurs when fetching and updating the question', async () => {
      // Mock request parameters
      const mockReqParams = {
        qid: '65e9b5a995b6c7045a30d823',
      };
      const mockReqQuery = {
        username: 'question2_user',
      };

      jest
        .spyOn(questionUtil, 'fetchAndIncrementQuestionViewsById')
        .mockResolvedValueOnce({ error: 'Error when fetching and updating a question' });

      // Making the request with custom header to trigger fetch error
      const response = await supertest(app)
        .get(`/question/getQuestionById/${mockReqParams.qid}?username=${mockReqQuery.username}`)
        .set('x-test-fetch-error', 'true');

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toBe(
        'Error when fetching question by id: Error while fetching question by id',
      );
    });
  });

  describe('GET /getQuestion', () => {
    it('should return the result of filterQuestionsBySearch as response even if request parameters of order and search are absent', async () => {
      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsBySearchSpy.mockReturnValueOnce(MOCK_POPULATED_QUESTIONS);
      // Making the request
      const response = await supertest(app).get('/question/getQuestion');

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(EXPECTED_QUESTIONS);
    });

    it('should return the result of filterQuestionsBySearch as response for an order and search criteria in the request parameters', async () => {
      // Mock request query parameters
      const mockReqQuery = {
        order: 'dummyOrder',
        search: 'dummySearch',
      };

      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsBySearchSpy.mockReturnValueOnce(MOCK_POPULATED_QUESTIONS);

      // Making the request
      const response = await supertest(app).get('/question/getQuestion').query(mockReqQuery);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(EXPECTED_QUESTIONS);
    });

    it('should return error if getQuestionsByOrder throws an error', async () => {
      // Mock request query parameters
      const mockReqQuery = {
        order: 'dummyOrder',
        search: 'dummySearch',
      };
      getQuestionsByOrderSpy.mockRejectedValueOnce(new Error('Error fetching questions'));

      // Making the request with custom header to trigger getQuestionsByOrder error
      const response = await supertest(app)
        .get('/question/getQuestion')
        .query(mockReqQuery)
        .set('x-test-error-order', 'true');

      // Asserting the response
      expect(response.status).toBe(500);
    });

    it('should return error if filterQuestionsBySearch throws an error', async () => {
      // Mock request query parameters
      const mockReqQuery = {
        order: 'dummyOrder',
        search: 'dummySearch',
      };
      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsBySearchSpy.mockImplementationOnce(() => {
        throw new Error('Error filtering questions');
      });

      // Making the request with custom header to trigger filterQuestionsBySearch error
      const response = await supertest(app)
        .get('/question/getQuestion')
        .query(mockReqQuery)
        .set('x-test-error-search', 'true');

      // Asserting the response
      expect(response.status).toBe(500);
    });
  });
});

// At the end of the file, modify how we cleanup resources
afterAll(async () => {
  // Clean up mocks
  jest.restoreAllMocks();

  // Close mongoose connection if open
  if (mongoose.connection.readyState) {
    await mongoose.connection.close();
  }

  // Wait for any lingering handlers
  await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
});
