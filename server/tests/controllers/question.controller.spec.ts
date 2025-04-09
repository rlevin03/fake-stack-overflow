import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import http from 'http';
import * as questionService from '../../services/question.service';
import * as tagService from '../../services/tag.service';
import * as databaseUtil from '../../utils/database.util';
import * as answerService from '../../services/answer.service';
import QuestionModel from '../../models/questions.model';
import UserModel from '../../models/users.model';
import * as badgeUtil from '../../utils/badge.util';
import questionController from '../../controllers/question.controller';
import {
  Answer,
  DatabaseQuestion,
  DatabaseTag,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestion,
  Question,
  Tag,
  FakeSOSocket,
} from '../../types/types';

// Mock dependencies
jest.mock('../../services/question.service', () => ({
  addVoteToQuestion: jest.fn(),
  fetchAndIncrementQuestionViewsById: jest.fn(),
  filterQuestionsByAskedBy: jest.fn(),
  filterQuestionsBySearch: jest.fn(),
  getQuestionsByOrder: jest.fn(),
  saveQuestion: jest.fn(),
}));

jest.mock('../../services/tag.service', () => ({
  processTags: jest.fn(),
}));

jest.mock('../../utils/database.util', () => ({
  populateDocument: jest.fn(),
}));

jest.mock('../../services/user.service', () => ({
  updateUserPreferences: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../services/gemini.service', () => ({
  getGeminiResponse: jest.fn().mockResolvedValue('AI generated answer'),
}));

jest.mock('../../services/answer.service', () => ({
  saveAnswer: jest.fn(),
  addAnswerToQuestion: jest.fn(),
}));

jest.mock('../../utils/badge.util', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../models/questions.model', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../../models/users.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

// Mock cron module to prevent open handles
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Setup spies
const addVoteToQuestionSpy = jest.spyOn(questionService, 'addVoteToQuestion');
const getQuestionsByOrderSpy = jest.spyOn(questionService, 'getQuestionsByOrder');
const filterQuestionsBySearchSpy = jest.spyOn(questionService, 'filterQuestionsBySearch');
const filterQuestionsByAskedBySpy = jest.spyOn(questionService, 'filterQuestionsByAskedBy');
const fetchAndIncrementQuestionViewsByIdSpy = jest.spyOn(
  questionService,
  'fetchAndIncrementQuestionViewsById',
);
const saveQuestionSpy = jest.spyOn(questionService, 'saveQuestion');
const processTagsSpy = jest.spyOn(tagService, 'processTags');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const userModelFindOneSpy = jest.spyOn(UserModel, 'findOne');
const awardingBadgeHelperSpy = jest.spyOn(badgeUtil, 'default');

// Mock socket with proper functions
const mockEmit = jest.fn();
const mockSocket = {
  emit: mockEmit,
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  broadcast: {
    emit: jest.fn(),
  },
} as unknown as FakeSOSocket;

// Create a new express app for testing with our mocked controller
const app = express();
app.use(express.json());
app.use('/question', questionController(mockSocket));

// Create a server to close after tests
const server = http.createServer(app);
const testServer = supertest(server);

// Test data
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

// Setup before tests
beforeAll(done => {
  server.listen(0, () => {
    done();
  });
});

// Cleanup after tests
afterAll(done => {
  server.close(done);
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default mocks for services that are used in multiple tests
  awardingBadgeHelperSpy.mockReset().mockResolvedValue(undefined);
  mockEmit.mockClear();
});

describe('Test questionController', () => {
  // Increase the default timeout for all tests in this describe block
  jest.setTimeout(20000);

  describe('POST /addQuestion', () => {
    it('should add a new question', async () => {
      processTagsSpy.mockResolvedValue([dbTag1, dbTag2]);
      saveQuestionSpy.mockResolvedValueOnce(mockDatabaseQuestion);
      populateDocumentSpy.mockResolvedValueOnce(mockPopulatedQuestion);
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId('507f191e810c19729de860e1'),
        username: 'question3_user',
        aiToggler: false,
      });

      // Making the request
      const response = await testServer.post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(mockPopulatedQuestion));
    }, 30000);

    it('should return 500 if error occurs in `saveQuestion` while adding a new question', async () => {
      processTagsSpy.mockResolvedValue([dbTag1, dbTag2]);
      saveQuestionSpy.mockResolvedValueOnce({ error: 'Error while saving question' });

      // Making the request
      const response = await testServer.post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when saving question');
    });

    it('should return 500 if error occurs in populateDocument while adding a new question', async () => {
      processTagsSpy.mockResolvedValue([dbTag1, dbTag2]);
      saveQuestionSpy.mockResolvedValueOnce(mockDatabaseQuestion);
      populateDocumentSpy.mockResolvedValueOnce({ error: 'Error while populating' });

      // Making the request
      const response = await testServer.post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when saving question');
    });

    it('should return 500 if tag ids could not be retrieved', async () => {
      // Empty array from processTags for this test
      processTagsSpy.mockResolvedValue([]);

      const response = await testServer.post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when saving question: Invalid tags');
    });

    it('should return bad request if question title is empty string', async () => {
      // Making the request
      const response = await testServer
        .post('/question/addQuestion')
        .send({ ...mockQuestion, title: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if question text is empty string', async () => {
      // Making the request
      const response = await testServer
        .post('/question/addQuestion')
        .send({ ...mockQuestion, text: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if tags are empty', async () => {
      // Making the request
      const response = await testServer
        .post('/question/addQuestion')
        .send({ ...mockQuestion, tags: [] });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should return bad request if askedBy is empty string', async () => {
      // Making the request
      const response = await testServer
        .post('/question/addQuestion')
        .send({ ...mockQuestion, askedBy: '' });

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid question body');
    });

    it('should process a question with ai toggle enabled', async () => {
      processTagsSpy.mockResolvedValue([dbTag1, dbTag2]);
      saveQuestionSpy.mockResolvedValueOnce(mockDatabaseQuestion);
      populateDocumentSpy.mockResolvedValueOnce(mockPopulatedQuestion);

      // Mock user with AI toggler enabled
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId('507f191e810c19729de860e1'),
        username: 'question3_user',
        aiToggler: true,
      });

      // Mock answer service functions
      jest.spyOn(answerService, 'saveAnswer').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        text: 'AI generated answer',
        ansBy: 'AI',
        ansDateTime: new Date(),
        upVotes: [],
        downVotes: [],
        comments: [],
      });

      // Making the request
      const response = await testServer.post('/question/addQuestion').send(mockQuestion);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(mockPopulatedQuestion));
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

      // Mock service functions
      addVoteToQuestionSpy.mockResolvedValue(mockResponse);

      // Mock the question model findById
      (QuestionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          tags: [dbTag1, dbTag2],
        }),
      });

      // Mock the user model findOne
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      });

      const response = await testServer.post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(addVoteToQuestionSpy).toHaveBeenCalledWith(
        mockReqBody.qid,
        mockReqBody.username,
        'upvote',
        expect.anything(),
      );
      return response;
    }, 30000);

    it('should cancel the upvote successfully', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'some-user',
      };

      const mockResponse = {
        msg: 'Upvote cancelled successfully',
        upVotes: [],
        downVotes: [],
      };

      // Mock service functions
      addVoteToQuestionSpy.mockResolvedValue(mockResponse);

      // Mock the question model findById
      (QuestionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          tags: [dbTag1],
        }),
      });

      // Mock the user model findOne
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      });

      const response = await testServer.post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      return response;
    }, 30000);

    it('should return bad request error if the request had qid missing', async () => {
      const { username } = { username: 'some-user' };

      const response = await testServer.post(`/question/upvoteQuestion`).send({ username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request');
      return response;
    });

    it('should return bad request error if the request had username missing', async () => {
      const { qid } = { qid: '65e9b5a995b6c7045a30d823' };

      const response = await testServer.post(`/question/upvoteQuestion`).send({ qid });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request');
      return response;
    });

    it('should return 500 if addVoteToQuestion returns an error', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      addVoteToQuestionSpy.mockResolvedValue({ error: 'Error adding vote' });

      const response = await testServer.post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when upvoteing');
      return response;
    });

    it('should return 500 if question is not found', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      addVoteToQuestionSpy.mockResolvedValue({
        msg: 'Question upvoted successfully',
        upVotes: ['new-user'],
        downVotes: [],
      });

      // Mock question findById to return null
      (QuestionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const response = await testServer.post('/question/upvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when upvoteing: Question not found');
      return response;
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

      // Mock service functions
      addVoteToQuestionSpy.mockResolvedValue(mockResponse);

      // Mock the question model findById
      (QuestionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          tags: [dbTag1],
        }),
      });

      // Mock the user model findOne
      (UserModel.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      });

      const response = await testServer.post('/question/downvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
      expect(addVoteToQuestionSpy).toHaveBeenCalledWith(
        mockReqBody.qid,
        mockReqBody.username,
        'downvote',
        expect.anything(),
      );
      return response;
    }, 30000);

    it('should return bad request error if the request had qid missing', async () => {
      const { username } = { username: 'some-user' };

      const response = await testServer.post(`/question/downvoteQuestion`).send({ username });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request');
      return response;
    });

    it('should return bad request error if the request had username missing', async () => {
      const { qid } = { qid: '65e9b5a995b6c7045a30d823' };

      const response = await testServer.post(`/question/downvoteQuestion`).send({ qid });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request');
      return response;
    });

    it('should return 500 if addVoteToQuestion returns an error', async () => {
      const mockReqBody = {
        qid: '65e9b5a995b6c7045a30d823',
        username: 'new-user',
      };

      addVoteToQuestionSpy.mockResolvedValue({ error: 'Error adding vote' });

      const response = await testServer.post('/question/downvoteQuestion').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when downvoteing');
      return response;
    });
  });

  describe('GET /getQuestionById/:qid', () => {
    it('should return a question object in the response when the question id is passed as request parameter', async () => {
      // Mock request parameters
      const { qid } = { qid: '65e9b5a995b6c7045a30d823' };
      const { username } = { username: 'question3_user' };

      const populatedFindQuestion = MOCK_POPULATED_QUESTIONS.filter(
        q => q._id.toString() === qid,
      )[0];

      // Provide mock question data
      fetchAndIncrementQuestionViewsByIdSpy.mockResolvedValueOnce(populatedFindQuestion);
      userModelFindOneSpy.mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
      });

      // Making the request
      const response = await testServer.get(
        `/question/getQuestionById/${qid}?username=${username}`,
      );

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(simplifyQuestion(populatedFindQuestion));
      return response;
    }, 30000);

    it('should return bad request error if the question id is not in the correct format', async () => {
      // Mock request parameters
      const { qid } = { qid: 'invalid id' };
      const { username } = { username: 'question2_user' };

      // Making the request
      const response = await testServer.get(
        `/question/getQuestionById/${qid}?username=${username}`,
      );

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid ID format');
      return response;
    });

    it('should return bad request error if the username is not provided', async () => {
      // Mock request parameters
      const { qid } = { qid: '65e9b5a995b6c7045a30d823' };

      // Making the request
      const response = await testServer.get(`/question/getQuestionById/${qid}`);

      // Asserting the response
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid username requesting question.');
      return response;
    });

    it('should return database error if fetchAndIncrementQuestionViewsById returns an error', async () => {
      // Mock request parameters
      const { qid } = { qid: '65e9b5a995b6c7045a30d823' };
      const { username } = { username: 'question2_user' };

      fetchAndIncrementQuestionViewsByIdSpy.mockResolvedValueOnce({
        error: 'Error while fetching question by id',
      });

      // Making the request
      const response = await testServer.get(
        `/question/getQuestionById/${qid}?username=${username}`,
      );

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when fetching question by id');
      return response;
    });
  });

  describe('GET /getQuestion', () => {
    it('should return questions filtered by search', async () => {
      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsBySearchSpy.mockReturnValueOnce(MOCK_POPULATED_QUESTIONS);

      // Making the request
      const response = await testServer.get('/question/getQuestion');

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(EXPECTED_QUESTIONS);
      return response;
    });

    it('should use provided order parameter', async () => {
      // Mock request query parameters
      const mockReqQuery = {
        order: 'mostRecent',
        search: 'react',
      };

      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsBySearchSpy.mockReturnValueOnce(MOCK_POPULATED_QUESTIONS);

      // Making the request
      const response = await testServer.get('/question/getQuestion').query(mockReqQuery);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(EXPECTED_QUESTIONS);
      expect(getQuestionsByOrderSpy).toHaveBeenCalledWith('mostRecent');
      return response;
    });

    it('should filter by askedBy if provided', async () => {
      // Mock request query parameters
      const mockReqQuery = {
        order: 'mostRecent',
        search: 'react',
        askedBy: 'question2_user',
      };

      getQuestionsByOrderSpy.mockResolvedValueOnce(MOCK_POPULATED_QUESTIONS);
      filterQuestionsByAskedBySpy.mockReturnValueOnce([MOCK_POPULATED_QUESTIONS[1]]);
      filterQuestionsBySearchSpy.mockReturnValueOnce([MOCK_POPULATED_QUESTIONS[1]]);

      // Making the request
      const response = await testServer.get('/question/getQuestion').query(mockReqQuery);

      // Asserting the response
      expect(response.status).toBe(200);
      expect(response.body).toEqual([EXPECTED_QUESTIONS[1]]);
      expect(filterQuestionsByAskedBySpy).toHaveBeenCalledWith(
        MOCK_POPULATED_QUESTIONS,
        'question2_user',
      );
      return response;
    });

    it('should return error if getQuestionsByOrder throws an error', async () => {
      getQuestionsByOrderSpy.mockRejectedValueOnce(new Error('Error fetching questions'));

      // Making the request
      const response = await testServer.get('/question/getQuestion');

      // Asserting the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when fetching questions by filter');
      return response;
    });
  });
});
