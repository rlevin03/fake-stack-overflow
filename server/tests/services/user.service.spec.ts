import mongoose from 'mongoose';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import {
  getTop10ByPoints,
  getRankForUser,
  updateUserPreferences,
  appendPointsHistory,
  getPointsHistory,
  getUserRecommendations,
  decayInactiveUserPoints,
} from '../../services/user.service';
import { SafeDatabaseUser } from '../../types/types';
import { user, safeUser } from '../mockData.models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

beforeEach(() => {
  mockingoose.resetAll();
});

describe('User Service - Extended Coverage', () => {
  it('should retrieve top 10 users by points', async () => {
    mockingoose(UserModel).toReturn([safeUser], 'find');
    const result = await getTop10ByPoints();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return error if getTop10ByPoints fails', async () => {
    mockingoose(UserModel).toReturn(new Error('DB error'), 'find');
    const result = await getTop10ByPoints();
    expect('error' in result).toBe(true);
  });

  it('should retrieve rank for user', async () => {
    mockingoose(UserModel).toReturn(user, 'findOne');
    mockingoose(UserModel).toReturn(5, 'countDocuments');
    const result = await getRankForUser(user.username);
    expect('rank' in result).toBe(true);
  });

  it('should return error if user not found for rank', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');
    const result = await getRankForUser(user.username);
    expect('error' in result).toBe(true);
  });

  it('should update preferences successfully', async () => {
    const updatedPreferencesUser: any = {
      _id: safeUser._id,
      preferences: [...safeUser.preferences], // start with existing prefs
      save: jest.fn().mockResolvedValue(undefined),
      toObject(this: any) {
        // expose current (possibly mutated) preferences
        return { ...safeUser, preferences: this.preferences };
      },
    };

    mockingoose(UserModel).toReturn(updatedPreferencesUser, 'findOne');

    const result = await updateUserPreferences(
      safeUser._id.toString(),
      [{ index: 0, value: 2 }],
    );

    expect((result as SafeDatabaseUser).preferences[0]).toBe(2);
  });

  it('should append points history', async () => {
    mockingoose(UserModel).toReturn(
      { ...safeUser, pointsHistory: ['initial'] },
      'findOneAndUpdate',
    );
    const result = (await appendPointsHistory(
      safeUser._id.toString(),
      'test',
    )) as SafeDatabaseUser;
    expect(result.pointsHistory).toContain('initial');
  });

  it('should return error if user not found for appendPointsHistory', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');
    const result = await appendPointsHistory(safeUser._id.toString(), 'test');
    expect('error' in result).toBe(true);
  });

  it('should retrieve points history', async () => {
    mockingoose(UserModel).toReturn({ pointsHistory: ['x'] }, 'findOne');
    const result = await getPointsHistory(user.username);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return error if getPointsHistory user not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');
    const result = await getPointsHistory(user.username);
    expect('error' in result).toBe(true);
  });

  it('should retrieve user recommendations (mocked)', async () => {
    const mockedUser = {
      ...user,
      preferences: Array(1000).fill(1),
      username: user.username,
    };

    // Service uses findById ➜ op name 'findOne'
    mockingoose(UserModel).toReturn(mockedUser, 'findOne');

    mockingoose(QuestionModel).toReturn(
      [
        {
          tags: [{ name: 'javascript' }],
          views: [],
        },
      ],
      'find',
    );

    const result = await getUserRecommendations(safeUser._id.toString());
    expect(Array.isArray(result)).toBe(true);
  });

  it('should call decayInactiveUserPoints without error', async () => {
    const now = Date.now();
    const lastActive = new Date(now - 61 * 24 * 60 * 60 * 1000); // 61 days ago
    const testUser = {
      ...user,
      lastActive,
      points: 100,
      _id: new mongoose.Types.ObjectId(),
    };

    mockingoose(UserModel).toReturn([testUser], 'find');
    mockingoose(UserModel).toReturn(testUser, 'updateOne');

    await expect(decayInactiveUserPoints()).resolves.toBeUndefined();
  });
});
