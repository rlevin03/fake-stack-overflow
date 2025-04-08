import mongoose from 'mongoose';
import supertest from 'supertest';
import { ObjectId } from 'mongodb';
import * as answerUtil from '../../services/answer.service';
import * as databaseUtil from '../../utils/database.util';
import * as badgeUtil from '../../utils/badge.util';
import QuestionModel from '../../models/questions.model';
import AnswerModel from '../../models/answers.model';
import UserModel from '../../models/users.model';
import express from 'express';
import answerController from '../../controllers/answer.controller';
import { FakeSOSocket } from '../../types/types';
import http from 'http';

// Mock models
jest.mock('../../models/questions.model');
jest.mock('../../models/answers.model');
jest.mock('../../models/users.model');

// Mock service functions
const saveAnswerSpy = jest.spyOn(answerUtil, 'saveAnswer');
const addAnswerToQuestionSpy = jest.spyOn(answerUtil, 'addAnswerToQuestion');
const popDocSpy = jest.spyOn(databaseUtil, 'populateDocument');
const addVoteToAnswerSpy = jest.spyOn(answerUtil, 'addVoteToAnswer');
const awardingBadgeHelperSpy = jest.spyOn(badgeUtil, 'default');

// Setup test app with mocked socket
// Create a proper mock that satisfies the FakeSOSocket type
const mockSocket = {
  emit: jest.fn(),
} as unknown as FakeSOSocket;

// Create a new express app for testing with our mocked controller
const app = express();
app.use(express.json());
app.use('/answer', answerController(mockSocket));

// Create a server to close after tests
const server = http.createServer(app);
let testServer: any;

// Setup before tests
beforeAll(done => {
  server.listen(0, () => {
    testServer = supertest(server);
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
  // Reset all mock implementations
  awardingBadgeHelperSpy.mockReset().mockResolvedValue(undefined);
});

describe('POST /addAnswer', () => {
  it('should add a new answer to the question', async () => {
    const validQid = new mongoose.Types.ObjectId();
    const validAid = new mongoose.Types.ObjectId();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
        downVotes: [],
        upVotes: [],
        comments: [],
      },
    };

    const mockAnswer = {
      _id: validAid,
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: new Date('2024-06-03'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };
    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);

    addAnswerToQuestionSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer._id],
      comments: [],
    });

    popDocSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer],
      comments: [],
    });

    // Mock QuestionModel.findById
    const mockFindByIdQuestion = {
      populate: jest.fn().mockResolvedValue({
        _id: validQid,
        title: 'This is a test question',
        text: 'This is a test question',
        tags: [{ name: 'react' }, { name: 'javascript' }],
        askedBy: 'dummyUserId',
        askDateTime: new Date('2024-06-03'),
        answers: [mockAnswer._id],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      }),
    };
    (QuestionModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuestion);

    // Mock UserModel.findOne
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      username: 'dummyUserId',
    });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      _id: validAid.toString(),
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: mockAnswer.ansDateTime.toISOString(),
      comments: [],
      upVotes: [],
      downVotes: [],
    });
  });

  it('should award lifeline badge when answer is posted after 24 hours', async () => {
    const validQid = new mongoose.Types.ObjectId();
    const validAid = new mongoose.Types.ObjectId();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-05'), // Answer 2 days after question
        downVotes: [],
        upVotes: [],
        comments: [],
      },
    };

    const mockAnswer = {
      _id: validAid,
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: new Date('2024-06-05'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };
    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);
    addAnswerToQuestionSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'), // Asked 2 days before answer
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer._id],
      comments: [],
    });
    popDocSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer],
      comments: [],
    });

    // Mock QuestionModel.findById
    const mockFindByIdQuestion = {
      populate: jest.fn().mockResolvedValue({
        _id: validQid,
        title: 'This is a test question',
        text: 'This is a test question',
        tags: [{ name: 'react' }],
        askedBy: 'dummyUserId',
        askDateTime: new Date('2024-06-03'),
        answers: [mockAnswer._id],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      }),
    };
    (QuestionModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuestion);

    // Mock UserModel.findOne
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      username: 'dummyUserId',
    });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(awardingBadgeHelperSpy).toHaveBeenCalledWith(
      'dummyUserId',
      'Lifeline',
      'Answered a question that was unanswered for more than 24 hours.',
      expect.anything(),
    );
  });

  it('should award lightning responder badge when answer is posted within 5 minutes', async () => {
    const validQid = new mongoose.Types.ObjectId();
    const validAid = new mongoose.Types.ObjectId();

    const questionTime = new Date('2024-06-03T10:00:00Z');
    const answerTime = new Date('2024-06-03T10:03:00Z'); // 3 minutes later

    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: answerTime,
        downVotes: [],
        upVotes: [],
        comments: [],
      },
    };

    const mockAnswer = {
      _id: validAid,
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: answerTime,
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);
    addAnswerToQuestionSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: questionTime,
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer._id],
      comments: [],
    });
    popDocSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: questionTime,
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer],
      comments: [],
    });

    // Mock QuestionModel.findById
    const mockFindByIdQuestion = {
      populate: jest.fn().mockResolvedValue({
        _id: validQid,
        title: 'This is a test question',
        text: 'This is a test question',
        tags: [{ name: 'react' }],
        askedBy: 'dummyUserId',
        askDateTime: questionTime,
        answers: [mockAnswer._id],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      }),
    };
    (QuestionModel.findById as jest.Mock).mockReturnValue(mockFindByIdQuestion);

    // Mock UserModel.findOne
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      username: 'dummyUserId',
    });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(awardingBadgeHelperSpy).toHaveBeenCalledWith(
      'dummyUserId',
      'Lightning Responder',
      'Answered a question within 5 minutes of it being posted.',
      expect.anything(),
    );
  });

  it('should return bad request error if answer text property is missing', async () => {
    const mockReqBody = {
      qid: 'dummyQuestionId',
      ans: {
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid answer');
  });

  it('should return bad request error if request body has qid property missing', async () => {
    const mockReqBody = {
      ans: {
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
  });

  it('should return bad request error if answer object has ansBy property missing', async () => {
    const mockReqBody = {
      qid: 'dummyQuestionId',
      ans: {
        text: 'This is a test answer',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
  });

  it('should return bad request error if answer object has ansDateTime property missing', async () => {
    const mockReqBody = {
      qid: 'dummyQuestionId',
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
      },
    };

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
  });

  it('should return bad request error if request body is missing', async () => {
    const response = await testServer.post('/answer/addAnswer');

    expect(response.status).toBe(400);
  });

  it('should return database error in response if saveAnswer method throws an error', async () => {
    const validQid = new mongoose.Types.ObjectId().toString();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    saveAnswerSpy.mockResolvedValueOnce({ error: 'Error when saving an answer' });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
  });

  it('should return database error in response if update question method throws an error', async () => {
    const validQid = new mongoose.Types.ObjectId().toString();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    const mockAnswer = {
      _id: new ObjectId('507f191e810c19729de860ea'),
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: new Date('2024-06-03'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);
    addAnswerToQuestionSpy.mockResolvedValueOnce({ error: 'Error when adding answer to question' });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
  });

  it('should return database error in response if `populateDocument` method throws an error', async () => {
    const validQid = new mongoose.Types.ObjectId();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
      },
    };

    const mockAnswer = {
      _id: new ObjectId('507f191e810c19729de860ea'),
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: new Date('2024-06-03'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    const mockQuestion = {
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      views: [],
      upVotes: [],
      downVotes: [],
      answers: [mockAnswer._id],
      comments: [],
    };

    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);
    addAnswerToQuestionSpy.mockResolvedValueOnce(mockQuestion);
    popDocSpy.mockResolvedValueOnce({ error: 'Error when populating document' });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
  });

  it('should handle case when question is not found after saving answer', async () => {
    const validQid = new mongoose.Types.ObjectId();
    const validAid = new mongoose.Types.ObjectId();
    const mockReqBody = {
      qid: validQid,
      ans: {
        text: 'This is a test answer',
        ansBy: 'dummyUserId',
        ansDateTime: new Date('2024-06-03'),
        downVotes: [],
        upVotes: [],
      },
    };

    const mockAnswer = {
      _id: validAid,
      text: 'This is a test answer',
      ansBy: 'dummyUserId',
      ansDateTime: new Date('2024-06-03'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    saveAnswerSpy.mockResolvedValueOnce(mockAnswer);
    addAnswerToQuestionSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      answers: [mockAnswer._id],
      views: [],
      upVotes: [],
      downVotes: [],
      comments: [],
    });
    popDocSpy.mockResolvedValueOnce({
      _id: validQid,
      title: 'This is a test question',
      text: 'This is a test question',
      tags: [],
      askedBy: 'dummyUserId',
      askDateTime: new Date('2024-06-03'),
      answers: [mockAnswer],
      views: [],
      upVotes: [],
      downVotes: [],
      comments: [],
    });

    // Mock QuestionModel.findById to return null
    (QuestionModel.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const response = await testServer.post('/answer/addAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(awardingBadgeHelperSpy).toHaveBeenCalledWith(
      'dummyUserId',
      'Helping Hand',
      'Provided 5+ answers',
      expect.anything(),
    );
  });
});

describe('POST /upvoteAnswer', () => {
  it('should successfully upvote an answer', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    const mockVoteResponse = {
      msg: 'Answer upvoted successfully',
      upVotes: ['testUser'],
      downVotes: [],
    };

    addVoteToAnswerSpy.mockResolvedValueOnce(mockVoteResponse);

    // Mock Answer find
    (AnswerModel.findById as jest.Mock).mockResolvedValue({
      _id: validAnsId,
      upVotes: ['testUser'],
      downVotes: [],
    });

    // Mock User find
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      username: 'testUser',
    });

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockVoteResponse);
    expect(addVoteToAnswerSpy).toHaveBeenCalledWith(
      validAnsId,
      username,
      'upvote',
      expect.anything(),
    );
    expect(awardingBadgeHelperSpy).toHaveBeenCalledWith(
      username,
      'Respected Voice',
      'Accumulated 500+ reputation points from upvotes on answers.',
      expect.anything(),
    );
  });

  it('should award peoples champion badge when answer has >= 50 upvotes', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();

    const mockReqBody = {
      ansid: validAnsId,
      username: 'upvoter',
    };

    const mockVoteResponse = {
      msg: 'Answer upvoted successfully',
      upVotes: Array(50).fill('upvoter'),
      downVotes: [],
    };

    addVoteToAnswerSpy.mockResolvedValueOnce(mockVoteResponse);

    // Mock Answer with 50 upvotes
    (AnswerModel.findById as jest.Mock).mockResolvedValue({
      _id: validAnsId,
      ansBy: 'answerAuthor',
      upVotes: Array(50).fill('someUser'),
      downVotes: [],
    });

    // Mock User find for upvoter
    (UserModel.findOne as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      username: 'upvoter',
    });

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(awardingBadgeHelperSpy).toHaveBeenCalledWith(
      'upvoter',
      'Peoples Champion',
      'Received 50+ upvotes on a single answer.',
      expect.anything(),
    );
  });

  it('should return 400 if request body is missing username', async () => {
    const mockReqBody = {
      ansid: 'validAnsId',
    };

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid request');
  });

  it('should return 400 if request body is missing ansid', async () => {
    const mockReqBody = {
      username: 'testUser',
    };

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid request');
  });

  it('should return 500 if addVoteToAnswer returns an error', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    addVoteToAnswerSpy.mockResolvedValueOnce({ error: 'Error adding vote' });

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when upvoteing');
  });

  it('should return 500 if answer is not found', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    addVoteToAnswerSpy.mockResolvedValueOnce({
      msg: 'Answer upvoted successfully',
      upVotes: ['testUser'],
      downVotes: [],
    });

    // Mock Answer find to return null
    (AnswerModel.findById as jest.Mock).mockResolvedValue(null);

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when upvoteing: Answer not found');
  });

  it('should return 500 if user is not found', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    addVoteToAnswerSpy.mockResolvedValueOnce({
      msg: 'Answer upvoted successfully',
      upVotes: ['testUser'],
      downVotes: [],
    });

    // Mock Answer find
    (AnswerModel.findById as jest.Mock).mockResolvedValue({
      _id: validAnsId,
      upVotes: ['testUser'],
      downVotes: [],
    });

    // Mock User find to return null
    (UserModel.findOne as jest.Mock).mockResolvedValue(null);

    const response = await testServer.post('/answer/upvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when upvoteing: User not found');
  });
});

describe('POST /downvoteAnswer', () => {
  it('should successfully downvote an answer', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    const mockVoteResponse = {
      msg: 'Answer downvoted successfully',
      upVotes: [],
      downVotes: ['testUser'],
    };

    addVoteToAnswerSpy.mockResolvedValueOnce(mockVoteResponse);

    const response = await testServer.post('/answer/downvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockVoteResponse);
    expect(addVoteToAnswerSpy).toHaveBeenCalledWith(
      validAnsId,
      username,
      'downvote',
      expect.anything(),
    );
  });

  it('should return 400 if request body is missing', async () => {
    const response = await testServer.post('/answer/downvoteAnswer');

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid request');
  });

  it('should return 500 if addVoteToAnswer returns an error', async () => {
    const validAnsId = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    const mockReqBody = {
      ansid: validAnsId,
      username,
    };

    addVoteToAnswerSpy.mockResolvedValueOnce({ error: 'Error adding vote' });

    const response = await testServer.post('/answer/downvoteAnswer').send(mockReqBody);

    expect(response.status).toBe(500);
    expect(response.text).toContain('Error when downvoteing');
  });
});
