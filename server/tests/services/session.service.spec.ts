import mongoose from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

import SessionModel from '../../models/sessions.model';
import UserModel from '../../models/users.model';
import {
  createSession,
  getSessionById,
  getUserSessions,
  addVersionToSession,
} from '../../services/session.service';

describe('Session Service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session for a valid user', async () => {
      const user = { _id: new mongoose.Types.ObjectId(), username: 'john' };
      const createdSession = {
        _id: new mongoose.Types.ObjectId(),
        createdBy: user._id,
        versions: [],
        toObject: () => ({ _id: user._id, createdBy: user._id, versions: [] }),
      };

      mockingoose(UserModel).toReturn(user, 'findOne');
      jest.spyOn(SessionModel, 'create').mockResolvedValueOnce(createdSession as any);

      const result = await createSession('john');
      expect(result).toMatchObject({ createdBy: user._id });
    });

    it('should return an error if user is not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      const result = await createSession('invalid');
      expect(result).toHaveProperty('error');
    });

    it('should return an error if session creation fails', async () => {
      const user = { _id: new mongoose.Types.ObjectId(), username: 'john' };
      mockingoose(UserModel).toReturn(user, 'findOne');
      jest.spyOn(SessionModel, 'create').mockRejectedValueOnce(new Error('DB error'));

      const result = await createSession('john');
      expect(result).toHaveProperty('error');
    });
  });

  describe('getSessionById', () => {
    it('should return a session when found', async () => {
      const session = { _id: new mongoose.Types.ObjectId(), versions: [] };
      mockingoose(SessionModel).toReturn(session, 'findOne');

      const result = await getSessionById(session._id.toString());
      expect(result).toMatchObject({ _id: session._id });
    });

    it('should return an error if session not found', async () => {
      mockingoose(SessionModel).toReturn(null, 'findOne');
      const result = await getSessionById(new mongoose.Types.ObjectId().toString());
      expect(result).toHaveProperty('error');
    });

    it('should return an error on DB failure', async () => {
      mockingoose(SessionModel).toReturn(new Error('DB error'), 'findOne');
      const result = await getSessionById(new mongoose.Types.ObjectId().toString());
      expect(result).toHaveProperty('error');
    });
  });

  describe('getUserSessions', () => {
    it('should return sessions for a user', async () => {
      const userId = new mongoose.Types.ObjectId();
      const sessions = [{ _id: new mongoose.Types.ObjectId(), createdBy: userId }];
      mockingoose(UserModel).toReturn({ _id: userId }, 'findOne');
      mockingoose(SessionModel).toReturn(sessions, 'find');

      const result = await getUserSessions('john');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should return error if user is not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      const result = await getUserSessions('invalid');
      expect(result).toHaveProperty('error');
    });

    it('should return error if DB throws during session lookup', async () => {
      const userId = new mongoose.Types.ObjectId();
      mockingoose(UserModel).toReturn({ _id: userId }, 'findOne');
      mockingoose(SessionModel).toReturn(new Error('DB error'), 'find');

      const result = await getUserSessions('john');
      expect(result).toHaveProperty('error');
    });
  });

  describe('addVersionToSession', () => {
    it('should add a version to an existing session', async () => {
      const sessionId = new mongoose.Types.ObjectId();
      const mockSave = jest.fn().mockResolvedValue(undefined);

      const sessionDoc = {
        _id: sessionId,
        versions: [],
        save: mockSave,
        updatedAt: new Date(),
        toObject: () => ({ _id: sessionId, versions: ['v1'], updatedAt: new Date() }),
      };

      mockingoose(SessionModel).toReturn(sessionDoc, 'findOne');

      const result = await addVersionToSession(sessionId.toString(), 'v1');
      expect('error' in result).toBe(false);
      expect((result as any).versions).toContain('v1');
    });

    it('should return error if session not found', async () => {
      mockingoose(SessionModel).toReturn(null, 'findOne');
      const result = await addVersionToSession(new mongoose.Types.ObjectId().toString(), 'v1');
      expect(result).toHaveProperty('error');
    });

    it('should return error on save failure', async () => {
      const sessionId = new mongoose.Types.ObjectId();
      const sessionDoc = {
        _id: sessionId,
        versions: [],
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      mockingoose(SessionModel).toReturn(sessionDoc, 'findById');

      const result = await addVersionToSession(sessionId.toString(), 'v1');
      expect(result).toHaveProperty('error');
    });
  });
});
