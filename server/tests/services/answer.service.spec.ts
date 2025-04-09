// tests/services/answer.service.spec.ts
import mongoose from 'mongoose';
import AnswerModel from '../../models/answers.model';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import {
  getMostRecentAnswerTime,
  saveAnswer,
  addAnswerToQuestion,
  addVoteToAnswer,
} from '../../services/answer.service';
import {
  Answer,
  DatabaseAnswer,
  FakeSOSocket,
  PopulatedDatabaseQuestion,
  SafeDatabaseUser,
} from '../../types/types';
import * as userService from '../../services/user.service';
import { QUESTIONS, ans1, ans4 } from '../mockData.models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('Answer service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('saveAnswer', () => {
    const mockAnswer: Answer = {
      text: 'This is a test answer',
      ansBy: 'dummyUser',
      ansDateTime: new Date('2025-06-06T12:00:00Z'),
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    it('should return the saved answer and award points', async () => {
      const created = {
        ...mockAnswer,
        _id: new mongoose.Types.ObjectId(),
      };

      jest
        .spyOn(AnswerModel, 'create')
        .mockResolvedValueOnce(created as unknown as ReturnType<typeof AnswerModel.create>);
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      jest
        .spyOn(UserModel, 'findOne')
        .mockResolvedValueOnce({ _id: 'u1' } as unknown as SafeDatabaseUser);
      jest
        .spyOn(userService, 'appendPointsHistory')
        .mockResolvedValueOnce({} as unknown as SafeDatabaseUser);

      const res = await saveAnswer(mockAnswer);
      expect(res).not.toHaveProperty('error');
      const savedAnswer = res as DatabaseAnswer;
      expect(savedAnswer._id).toBeDefined();
      expect(savedAnswer.text).toBe(mockAnswer.text);
    });

    it('should still return the saved answer if no userRecord is found', async () => {
      const created = {
        ...mockAnswer,
        _id: new mongoose.Types.ObjectId(),
      };

      jest
        .spyOn(AnswerModel, 'create')
        .mockResolvedValueOnce(created as unknown as ReturnType<typeof AnswerModel.create>);
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const res = await saveAnswer(mockAnswer);
      expect(res).not.toHaveProperty('error');
      const savedAnswer = res as DatabaseAnswer;
      expect(savedAnswer._id).toBeDefined();
      expect(savedAnswer.text).toBe(mockAnswer.text);
    });

    it('should return an error if create throws', async () => {
      jest.spyOn(AnswerModel, 'create').mockRejectedValueOnce(new Error('DB failure'));

      const res = await saveAnswer(mockAnswer);
      expect(res).toEqual({ error: 'Error when saving an answer' });
    });
  });

  describe('addAnswerToQuestion', () => {
    it('should return updated question when successful', async () => {
      const question = { ...QUESTIONS[0], answers: [ans1._id] };
      const updatedQuestion = {
        ...question,
        answers: [...question.answers, ans4._id],
      };

      jest
        .spyOn(QuestionModel, 'findOneAndUpdate')
        .mockResolvedValueOnce(
          updatedQuestion as unknown as ReturnType<typeof QuestionModel.findOneAndUpdate>,
        );

      const res = await addAnswerToQuestion(question._id.toString(), ans4);

      if ('error' in res) {
        fail('Expected successful response but got error');
      } else {
        expect(res.answers).toContain(ans4._id);
      }
    });

    it('should return error object if findOneAndUpdate throws', async () => {
      jest.spyOn(QuestionModel, 'findOneAndUpdate').mockRejectedValueOnce(new Error('error'));

      const res = await addAnswerToQuestion('anyId', ans1);
      expect(res).toEqual({ error: 'Error when adding answer to question' });
    });

    it('should return error object if findOneAndUpdate returns null', async () => {
      jest.spyOn(QuestionModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const res = await addAnswerToQuestion('anyId', ans1);
      expect(res).toEqual({ error: 'Error when adding answer to question' });
    });

    it('should return error if answer is invalid', async () => {
      const invalid = { text: 'hi', ansBy: 'u' } as unknown as DatabaseAnswer;
      const res = await addAnswerToQuestion('qid', invalid);
      expect(res).toEqual({ error: 'Error when adding answer to question' });
    });
  });

  describe('getMostRecentAnswerTime', () => {
    it('should pick the latest ansDateTime per question', () => {
      const qid = new mongoose.Types.ObjectId();

      const dates = [
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-02-01T00:00:00Z'),
        new Date('2025-01-15T00:00:00Z'),
      ];

      const question = {
        _id: qid,
        answers: dates.map(d => ({ ansDateTime: d })),
      } as unknown as PopulatedDatabaseQuestion;

      const mp = new Map<string, Date>();

      getMostRecentAnswerTime(question, mp);
      expect(mp.get(qid.toString())!.toISOString()).toBe('2025-02-01T00:00:00.000Z');

      const laterDate = new Date('2025-03-01T12:34:56Z');
      question.answers.push({
        ansDateTime: laterDate,
      } as unknown as PopulatedDatabaseQuestion['answers'][0]);

      getMostRecentAnswerTime(question, mp);
      expect(mp.get(qid.toString())!.toISOString()).toBe('2025-03-01T12:34:56.000Z');
    });
  });

  describe('addVoteToAnswer', () => {
    let socket: FakeSOSocket;
    const ansid = new mongoose.Types.ObjectId().toString();
    const username = 'testUser';

    beforeEach(() => {
      socket = { emit: jest.fn() } as unknown as FakeSOSocket;
      jest
        .spyOn(userService, 'getTop10ByPoints')
        .mockResolvedValueOnce([{ _id: 'u1', username: 'u1' } as unknown as SafeDatabaseUser]);
      jest
        .spyOn(userService, 'appendPointsHistory')
        .mockResolvedValueOnce({} as unknown as SafeDatabaseUser);
    });

    it('should upvote and emit leaderboard', async () => {
      mockingoose(AnswerModel).toReturn(
        { _id: ansid, upVotes: [username], downVotes: [] },
        'findOneAndUpdate',
      );
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      mockingoose(UserModel).toReturn({ _id: 'u1' }, 'findOne');

      const result = await addVoteToAnswer(ansid, username, 'upvote', socket);
      if ('error' in result) throw new Error(result.error);

      expect(result.msg).toBe('Answer upvoted successfully');
      expect(result.upVotes).toEqual([username]);
      expect(result.downVotes).toEqual([]);
      expect(socket.emit).toHaveBeenCalledWith('top10Response', [{ _id: 'u1', username: 'u1' }]);
    });

    it('should cancel upvote if already upvoted', async () => {
      mockingoose(AnswerModel).toReturn(
        { _id: ansid, upVotes: [], downVotes: [] },
        'findOneAndUpdate',
      );
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      mockingoose(UserModel).toReturn({ _id: 'u1' }, 'findOne');

      const result = await addVoteToAnswer(ansid, username, 'upvote', socket);
      if ('error' in result) throw new Error(result.error);

      expect(result.msg).toBe('Upvote cancelled successfully');
      expect(result.upVotes).toEqual([]);
      expect(result.downVotes).toEqual([]);
    });

    it('should downvote and emit leaderboard', async () => {
      mockingoose(AnswerModel).toReturn(
        { _id: ansid, upVotes: [], downVotes: [username] },
        'findOneAndUpdate',
      );
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      mockingoose(UserModel).toReturn({ _id: 'u1' }, 'findOne');

      const result = await addVoteToAnswer(ansid, username, 'downvote', socket);
      if ('error' in result) throw new Error(result.error);

      expect(result.msg).toBe('Answer downvoted successfully');
      expect(result.upVotes).toEqual([]);
      expect(result.downVotes).toEqual([username]);
      expect(socket.emit).toHaveBeenCalledWith('top10Response', [{ _id: 'u1', username: 'u1' }]);
    });

    it('should cancel downvote if already downvoted', async () => {
      mockingoose(AnswerModel).toReturn(
        { _id: ansid, upVotes: [], downVotes: [] },
        'findOneAndUpdate',
      );
      jest
        .spyOn(UserModel, 'updateOne')
        .mockResolvedValueOnce({ modifiedCount: 1 } as unknown as ReturnType<
          typeof UserModel.updateOne
        >);
      mockingoose(UserModel).toReturn({ _id: 'u1' }, 'findOne');

      const result = await addVoteToAnswer(ansid, username, 'downvote', socket);
      if ('error' in result) throw new Error(result.error);

      expect(result.msg).toBe('Downvote cancelled successfully');
      expect(result.upVotes).toEqual([]);
      expect(result.downVotes).toEqual([]);
    });

    it('should return error if answer not found', async () => {
      mockingoose(AnswerModel).toReturn(null, 'findOneAndUpdate');
      const result = await addVoteToAnswer(ansid, username, 'upvote', socket);
      expect(result).toEqual({ error: 'Answer not found!' });
    });

    it('should return error on DB failure', async () => {
      jest.spyOn(AnswerModel, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Error'));
      const result = await addVoteToAnswer(ansid, username, 'upvote', socket);
      expect(result).toEqual({ error: 'Error when adding upvote to answer' });
    });
  });
});
