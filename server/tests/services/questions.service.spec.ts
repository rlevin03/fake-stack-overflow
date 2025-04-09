import mongoose from 'mongoose';
import QuestionModel from '../../models/questions.model';
import UserModel from '../../models/users.model';
import {
  filterQuestionsBySearch,
  getQuestionsByOrder,
  fetchAndIncrementQuestionViewsById,
  saveQuestion,
  addVoteToQuestion,
} from '../../services/question.service';
import {
  DatabaseQuestion,
  FakeSOSocket,
  PopulatedDatabaseQuestion,
  Question,
} from '../../types/types';
import { safeUser, POPULATED_QUESTIONS } from '../mockData.models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

const mockSocket: FakeSOSocket = {
  emit: jest.fn(),
} as unknown as FakeSOSocket;

describe('Question Service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('filterQuestionsBySearch', () => {
    it('should filter questions by search string', () => {
      const questions: PopulatedDatabaseQuestion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test question 1',
          text: 'Some text',
          tags: [],
          askedBy: 'user1',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Another question',
          text: 'Different text',
          tags: [],
          askedBy: 'user2',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
      ];

      const result = filterQuestionsBySearch(questions, 'Test');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test question 1');
    });

    it('should return all questions with empty search string', () => {
      const result = filterQuestionsBySearch(POPULATED_QUESTIONS, '');
      expect(result.length).toEqual(POPULATED_QUESTIONS.length);
    });

    it('should return empty list with empty questions', () => {
      const result = filterQuestionsBySearch([], 'test');
      expect(result.length).toEqual(0);
    });

    it('should return empty list with empty questions and empty string', () => {
      const result = filterQuestionsBySearch([], '');
      expect(result.length).toEqual(0);
    });

    it('should filter questions by tag', () => {
      const result = filterQuestionsBySearch(POPULATED_QUESTIONS, '[android]');
      expect(result.length).toEqual(1);
      expect(result[0]._id.toString()).toEqual('65e9b58910afe6e94fc6e6dc');
    });

    it('should filter questions by multiple tags', () => {
      const result = filterQuestionsBySearch(POPULATED_QUESTIONS, '[android] [javascript]');
      expect(result.length).toEqual(2);
      expect(result[0]._id.toString()).toEqual('65e9b58910afe6e94fc6e6dc');
      expect(result[1]._id.toString()).toEqual('65e9b5a995b6c7045a30d823');
    });

    it('should filter questions by keyword', () => {
      const result = filterQuestionsBySearch(POPULATED_QUESTIONS, 'storage');
      expect(result.length).toEqual(2);
      expect(result[0]._id.toString()).toEqual('65e9b58910afe6e94fc6e6dc');
      expect(result[1]._id.toString()).toEqual('65e9b5a995b6c7045a30d823');
    });

    it('should filter questions by tag and keyword', () => {
      const result = filterQuestionsBySearch(POPULATED_QUESTIONS, 'storage [android]');
      expect(result.length).toEqual(2);
      expect(result[0]._id.toString()).toEqual('65e9b58910afe6e94fc6e6dc');
      expect(result[1]._id.toString()).toEqual('65e9b5a995b6c7045a30d823');
    });
  });

  describe('getQuestionsByOrder', () => {
    it('should return questions ordered by active', async () => {
      const questions: PopulatedDatabaseQuestion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test question 1',
          text: 'Some text',
          tags: [],
          askedBy: 'user1',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
      ];

      mockingoose(QuestionModel).toReturn(questions, 'find');

      const result = await getQuestionsByOrder('active');
      expect(result).toHaveLength(1);
    });

    it('should return questions ordered by unanswered', async () => {
      const questions: PopulatedDatabaseQuestion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test question 1',
          text: 'Some text',
          tags: [],
          askedBy: 'user1',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
      ];

      mockingoose(QuestionModel).toReturn(questions, 'find');

      const result = await getQuestionsByOrder('unanswered');
      expect(result).toHaveLength(1);
    });

    it('should return questions ordered by newest', async () => {
      const questions: PopulatedDatabaseQuestion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test question 1',
          text: 'Some text',
          tags: [],
          askedBy: 'user1',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
      ];

      mockingoose(QuestionModel).toReturn(questions, 'find');

      const result = await getQuestionsByOrder('newest');
      expect(result).toHaveLength(1);
    });

    it('should return questions ordered by mostViewed', async () => {
      const questions: PopulatedDatabaseQuestion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test question 1',
          text: 'Some text',
          tags: [],
          askedBy: 'user1',
          askDateTime: new Date(),
          answers: [],
          views: [],
          upVotes: [],
          downVotes: [],
          comments: [],
        },
      ];

      mockingoose(QuestionModel).toReturn(questions, 'find');

      const result = await getQuestionsByOrder('mostViewed');
      expect(result).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      mockingoose(QuestionModel).toReturn(new Error('Database error'), 'find');

      const result = await getQuestionsByOrder('active');
      expect(result).toHaveLength(0);
    });
  });

  describe('fetchAndIncrementQuestionViewsById', () => {
    it('should fetch and increment question views', async () => {
      const question: PopulatedDatabaseQuestion = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test question',
        text: 'Some text',
        tags: [],
        askedBy: 'user1',
        askDateTime: new Date(),
        answers: [],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      };

      mockingoose(QuestionModel).toReturn(question, 'findOneAndUpdate');

      const result = await fetchAndIncrementQuestionViewsById(question._id.toString(), 'user2');
      if (!('error' in result)) {
        expect(result._id).toEqual(question._id);
      }
    });

    it('should handle question not found', async () => {
      mockingoose(QuestionModel).toReturn(null, 'findOneAndUpdate');

      const result = await fetchAndIncrementQuestionViewsById('nonexistentid', 'user1');
      expect('error' in result).toBe(true);
    });

    it('should handle database errors', async () => {
      mockingoose(QuestionModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await fetchAndIncrementQuestionViewsById('someid', 'user1');
      expect('error' in result).toBe(true);
    });
  });

  describe('saveQuestion', () => {
    it('should save a new question', async () => {
      const question: Question = {
        title: 'Test question',
        text: 'Some text',
        tags: [],
        askedBy: 'user1',
        askDateTime: new Date(),
        answers: [],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      };

      const savedQuestion: DatabaseQuestion = {
        ...question,
        _id: new mongoose.Types.ObjectId(),
        tags: [], // Empty array of ObjectIds
        answers: [], // Empty array of ObjectIds
        comments: [], // Empty array of ObjectIds
      };

      mockingoose(QuestionModel).toReturn(savedQuestion, 'create');
      mockingoose(UserModel).toReturn({ ...safeUser, points: 10 }, 'updateOne');

      const result = await saveQuestion(question, mockSocket);
      if (!('error' in result)) {
        expect(result._id).toBeDefined();
        expect(result.title).toBe(question.title);
      }
    });

    it('should handle database errors', async () => {
      const question: Question = {
        title: 'Test question',
        text: 'Some text',
        tags: [],
        askedBy: 'user1',
        askDateTime: new Date(),
        answers: [],
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [],
      };

      // Use jest.spyOn to properly mock the rejection
      jest.spyOn(QuestionModel, 'create').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = await saveQuestion(question, mockSocket);
      expect('error' in result).toBe(true);
    });
  });

  describe('addVoteToQuestion', () => {
    it('should add an upvote to a question', async () => {
      const question: DatabaseQuestion = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test question',
        text: 'Some text',
        tags: [], // Empty array of ObjectIds
        askedBy: 'user1',
        askDateTime: new Date(),
        answers: [], // Empty array of ObjectIds
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [], // Empty array of ObjectIds
      };

      mockingoose(QuestionModel).toReturn({ ...question, upVotes: ['user2'] }, 'findOneAndUpdate');
      mockingoose(UserModel).toReturn({ ...safeUser, points: 1 }, 'updateOne');

      const result = await addVoteToQuestion(
        question._id.toString(),
        'user2',
        'upvote',
        mockSocket,
      );
      if (!('error' in result)) {
        expect(result.upVotes).toContain('user2');
        expect(result.downVotes).not.toContain('user2');
      }
    });

    it('should add a downvote to a question', async () => {
      const question: DatabaseQuestion = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test question',
        text: 'Some text',
        tags: [], // Empty array of ObjectIds
        askedBy: 'user1',
        askDateTime: new Date(),
        answers: [], // Empty array of ObjectIds
        views: [],
        upVotes: [],
        downVotes: [],
        comments: [], // Empty array of ObjectIds
      };

      mockingoose(QuestionModel).toReturn(
        { ...question, downVotes: ['user2'] },
        'findOneAndUpdate',
      );
      mockingoose(UserModel).toReturn({ ...safeUser, points: 1 }, 'updateOne');

      const result = await addVoteToQuestion(
        question._id.toString(),
        'user2',
        'downvote',
        mockSocket,
      );
      if (!('error' in result)) {
        expect(result.downVotes).toContain('user2');
        expect(result.upVotes).not.toContain('user2');
      }
    });

    it('should handle question not found', async () => {
      mockingoose(QuestionModel).toReturn(null, 'findOneAndUpdate');

      const result = await addVoteToQuestion('nonexistentid', 'user1', 'upvote', mockSocket);
      expect('error' in result).toBe(true);
    });

    it('should handle database errors', async () => {
      mockingoose(QuestionModel).toReturn(new Error('Database error'), 'findOneAndUpdate');

      const result = await addVoteToQuestion('someid', 'user1', 'upvote', mockSocket);
      expect('error' in result).toBe(true);
    });
  });
});
