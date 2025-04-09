import mongoose from 'mongoose';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  saveUser,
  updateUser,
  getTop10ByPoints,
  getRankForUser,
  updateUserPreferences,
  getUserRecommendations,
  appendPointsHistory,
  getPointsHistory,
  decayInactiveUserPoints,
} from '../../services/user.service';
import { SafeDatabaseUser, User } from '../../types/types';
import { user, safeUser } from '../mockData.models';

// For preferences update testing
interface PreferenceUpdate {
  index: number;
  value: number;
}

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
    const updatedPreferencesUser = {
      _id: safeUser._id,
      preferences: [...safeUser.preferences], // start with existing prefs
      save: jest.fn().mockResolvedValue(undefined),
      toObject() {
        // expose current (possibly mutated) preferences
        return { ...safeUser, preferences: this.preferences };
      },
    };

    mockingoose(UserModel).toReturn(updatedPreferencesUser, 'findOne');

    const result = await updateUserPreferences(safeUser._id.toString(), [
      { index: 0, value: 2 },
    ] as PreferenceUpdate[]);

    expect((result as SafeDatabaseUser).preferences[0]).toBe(2);
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

  it('should throw an error if a database error while deleting', async () => {
    mockingoose(UserModel).toReturn(new Error('Error deleting object'), 'findOneAndDelete');

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });
});

describe('updateUser', () => {
  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeDatabaseUser = {
    _id: new mongoose.Types.ObjectId(),
    username: user.username,
    dateJoined: user.dateJoined,
    points: 0,
    badges: [],
    preferences: [],
    aiToggler: false,
    pointsHistory: [],
    hideRanking: false,
    lastActive: new Date(),
  };

  const updates: Partial<User> = {
    password: 'newPassword',
  };

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the updated user when updated succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUpdatedUser, 'findOneAndUpdate');

    const result = (await updateUser(user.username, updates)) as SafeDatabaseUser;

    expect(result.username).toEqual(user.username);
    expect(result.username).toEqual(updatedUser.username);
    expect(result.dateJoined).toEqual(user.dateJoined);
    expect(result.dateJoined).toEqual(updatedUser.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    mockingoose(UserModel).toReturn(new Error('Error updating object'), 'findOneAndUpdate');

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should update the biography if the user is found', async () => {
    const newBio = 'This is a new biography';
    // Make a new partial updates object just for biography
    const biographyUpdates: Partial<User> = { biography: newBio };

    // Mock the DB to return a safe user (i.e., no password in results)
    mockingoose(UserModel).toReturn({ ...safeUpdatedUser, biography: newBio }, 'findOneAndUpdate');

    const result = await updateUser(user.username, biographyUpdates);

    // Check that the result is a SafeUser and the biography got updated
    if ('username' in result) {
      expect(result.biography).toEqual(newBio);
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should return an error if biography update fails because user not found', async () => {
    // Simulate user not found
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

    const newBio = 'No user found test';
    const biographyUpdates: Partial<User> = { biography: newBio };
    const updatedError = await updateUser(user.username, biographyUpdates);

    expect('error' in updatedError).toBe(true);
  });
});

describe('getTop10ByPoints', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the top 10 users by points', async () => {
    const top10Users = Array(10).fill(safeUser);
    mockingoose(UserModel).toReturn(top10Users, 'find');

    const result = await getTop10ByPoints();
    if (Array.isArray(result)) {
      expect(result).toHaveLength(10);
      expect(result[0].username).toEqual(safeUser.username);
    } else {
      throw new Error('Expected array result');
    }
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding documents'), 'find');

    const result = await getTop10ByPoints();

    expect('error' in result).toBe(true);
  });
});

describe('getRankForUser', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the correct rank for a user', async () => {
    const userWithPoints = { ...safeUser, points: 100 };
    mockingoose(UserModel).toReturn(userWithPoints, 'findOne');
    mockingoose(UserModel).toReturn(5, 'countDocuments');

    const result = await getRankForUser(safeUser.username);
    if ('rank' in result) {
      expect(result.rank).toBe(6); // 5 users with higher points + 1
    } else {
      throw new Error('Expected rank result');
    }
  });

  it('should return an error if user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const result = await getRankForUser('nonexistentuser');

    expect('error' in result).toBe(true);
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding user'), 'findOne');

    const result = await getRankForUser(safeUser.username);

    expect('error' in result).toBe(true);
  });
});

describe('updateUserPreferences', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should update user preferences successfully', async () => {
    const userWithPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(0),
      save: jest.fn().mockResolvedValue(true),
    };
    mockingoose(UserModel).toReturn(userWithPreferences, 'findById');

    const updates = [
      { index: 0, value: 1 },
      { index: 1, value: 2 },
    ];

    const result = await updateUserPreferences(safeUser._id.toString(), updates);
    if (!('error' in result)) {
      expect(result.preferences[0]).toBe(1);
      expect(result.preferences[1]).toBe(2);
    }
  });

  it('should return an error if user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findById');

    const updates = [{ index: 0, value: 1 }];
    const result = await updateUserPreferences('nonexistentid', updates);

    expect('error' in result).toBe(true);
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Error updating preferences'), 'findById');

    const updates = [{ index: 0, value: 1 }];
    const result = await updateUserPreferences(safeUser._id.toString(), updates);

    expect('error' in result).toBe(true);
  });
});

describe('getUserRecommendations', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return recommendations for a user', async () => {
    const userWithPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(0),
    };
    mockingoose(UserModel).toReturn(userWithPreferences, 'findById');

    const mockQuestion = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Question',
      text: 'Test Question Text',
      tags: [{ name: 'test' }],
      answers: [],
      comments: [],
    };

    mockingoose(QuestionModel).toReturn([mockQuestion], 'find').toReturn(mockQuestion, 'populate');

    const result = await getUserRecommendations(safeUser._id.toString());
    if (Array.isArray(result)) {
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('similarity');
    }
  });

  it('should return an error if user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findById');

    const result = await getUserRecommendations('nonexistentid');

    expect('error' in result).toBe(true);
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding user'), 'findById');

    const result = await getUserRecommendations(safeUser._id.toString());

    expect('error' in result).toBe(true);
  });
});

describe('appendPointsHistory', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it("should append a new history item to the user's pointsHistory", async () => {
    const userWithHistory = {
      ...safeUser,
      pointsHistory: ['Initial points: 0'],
    };
    const updatedUserWithHistory = {
      ...userWithHistory,
      pointsHistory: [
        ...userWithHistory.pointsHistory,
        'Earned 10 points for answering a question',
      ],
    };

    mockingoose(UserModel).toReturn(updatedUserWithHistory, 'findByIdAndUpdate');

    const historyItem = 'Earned 10 points for answering a question';
    const result = await appendPointsHistory(safeUser._id.toString(), historyItem);

    if ('pointsHistory' in result) {
      expect(result.pointsHistory).toContain(historyItem);
      expect(result.pointsHistory.length).toBe(2);
    }
  });

  it('should return an error if user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findByIdAndUpdate');

    const historyItem = 'Earned 10 points for answering a question';
    const result = await appendPointsHistory('nonexistentid', historyItem);

    expect('error' in result).toBe(true);
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Database error'), 'findByIdAndUpdate');

    const historyItem = 'Earned 10 points for answering a question';
    const result = await appendPointsHistory(safeUser._id.toString(), historyItem);

    expect('error' in result).toBe(true);
  });
});

describe('getPointsHistory', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the points history for a user', async () => {
    const pointsHistoryData = ['Initial points: 0', 'Earned 10 points for answering a question'];
    const userWithHistory = {
      ...safeUser,
      pointsHistory: pointsHistoryData,
    };

    mockingoose(UserModel).toReturn(userWithHistory, 'findOne');

    const result = await getPointsHistory(safeUser.username);

    if (Array.isArray(result)) {
      expect(result).toEqual(pointsHistoryData);
      expect(result.length).toBe(2);
    } else {
      throw new Error('Expected an array of history items, got an error object');
    }
  });

  it('should return an empty array if user has no points history', async () => {
    const userWithoutHistory = {
      ...safeUser,
      pointsHistory: [],
    };

    mockingoose(UserModel).toReturn(userWithoutHistory, 'findOne');

    const result = await getPointsHistory(safeUser.username);

    if (Array.isArray(result)) {
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    } else {
      throw new Error('Expected an empty array, got an error object');
    }
  });

  it('should return an error if user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const result = await getPointsHistory('nonexistentuser');

    expect('error' in result).toBe(true);
  });

  it('should return an error if there is a database error', async () => {
    mockingoose(UserModel).toReturn(new Error('Database error'), 'findOne');

    const result = await getPointsHistory(safeUser.username);

    expect('error' in result).toBe(true);
  });
});

describe('decayInactiveUserPoints', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-15')); // Fixed current date for testing
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should decay points for inactive users correctly', async () => {
    // Create inactive users with different periods of inactivity
    const sixtyDaysAgo = new Date('2024-02-15'); // Exactly 60 days ago
    const ninetyDaysAgo = new Date('2024-01-16'); // 90 days ago (1 decay period)
    const oneHundredTwentyDaysAgo = new Date('2023-12-17'); // 120 days ago (2 decay periods)

    const inactiveUsers = [
      { ...user, _id: new mongoose.Types.ObjectId(), points: 100, lastActive: sixtyDaysAgo },
      { ...user, _id: new mongoose.Types.ObjectId(), points: 100, lastActive: ninetyDaysAgo },
      {
        ...user,
        _id: new mongoose.Types.ObjectId(),
        points: 100,
        lastActive: oneHundredTwentyDaysAgo,
      },
    ];

    // Mock the find and updateOne methods
    mockingoose(UserModel).toReturn(inactiveUsers, 'find');

    const updateOneSpy = jest
      .spyOn(UserModel, 'updateOne')
      .mockResolvedValue({ nModified: 1 } as unknown as ReturnType<typeof UserModel.updateOne>);

    await decayInactiveUserPoints();

    expect(updateOneSpy).toHaveBeenCalledTimes(3);

    // Verify that calls were made with the correct point calculations
    // Type assertion is necessary to avoid TypeScript errors
    const updateCalls = updateOneSpy.mock.calls;

    expect(
      updateCalls.some(call => {
        const updateQuery = call[1] as { $set?: { points: number } };
        return updateQuery.$set && updateQuery.$set.points === 81;
      }),
    ).toBe(true);

    expect(
      updateCalls.some(call => {
        const updateQuery = call[1] as { $set?: { points: number } };
        return updateQuery.$set && updateQuery.$set.points === 72;
      }),
    ).toBe(true);

    updateOneSpy.mockRestore();
  });

  it('should handle database errors gracefully', async () => {
    // Mock find to throw an error
    mockingoose(UserModel).toReturn(new Error('Database error'), 'find');

    // This test passes if the function doesn't throw an error
    // No assertions needed, we just need to make sure it completes without error
    await decayInactiveUserPoints();
    expect(true).toBe(true); // Just to make sure the test runs
  });

  it('should not update users who are active within the 60-day threshold', async () => {
    mockingoose(UserModel).toReturn([], 'find');

    const updateOneSpy = jest.spyOn(UserModel, 'updateOne');

    await decayInactiveUserPoints();

    // No user should be updated
    expect(updateOneSpy).not.toHaveBeenCalled();

    updateOneSpy.mockRestore();
  });
});

// Test the formatError utility function
describe('formatError utility', () => {
  // We need to access the private formatError function
  // Since it's not exported, we'll test it indirectly through a function that uses it

  it('should format Error objects correctly', async () => {
    // Mock a function that will fail with an Error object
    jest.spyOn(UserModel, 'findOne').mockImplementationOnce(() => {
      throw new Error('Test error message');
    });

    const result = await getUserByUsername('testuser');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Test error message');
    }
  });

  it('should format non-Error objects correctly', async () => {
    // Mock a function that will fail with a string
    jest.spyOn(UserModel, 'findOne').mockImplementationOnce(() => {
      throw 'String error message';
    });

    const result = await getUserByUsername('testuser');

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('String error message');
    }
  });
});

describe('saveUser edge cases', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should throw an error when create returns null', async () => {
    // Explicitly return null from the create operation
    jest
      .spyOn(UserModel, 'create')
      .mockResolvedValueOnce(null as unknown as ReturnType<typeof UserModel.create>);

    const result = await saveUser(user);

    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Failed to create user');
    }
  });
});

// Additional edge cases for updateUserPreferences
describe('updateUserPreferences additional cases', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should ignore preference updates with out-of-range indices', async () => {
    const userWithPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(0),
      save: jest.fn().mockResolvedValue(true),
    };
    mockingoose(UserModel).toReturn(userWithPreferences, 'findById');

    // Include some valid and some invalid indices
    const updates = [
      { index: 5, value: 1 }, // Valid
      { index: 999, value: 2 }, // Valid - boundary
      { index: 1000, value: 3 }, // Invalid - too high
      { index: -1, value: 4 }, // Invalid - negative
    ];

    const result = await updateUserPreferences(safeUser._id.toString(), updates);

    if (!('error' in result)) {
      // Valid indices should be updated
      expect(result.preferences[5]).toBe(1);
      expect(result.preferences[999]).toBe(2);

      // Invalid indices should be ignored
      expect(result.preferences.length).toBe(1000); // Length shouldn't change

      // The save method should still be called once
      expect(userWithPreferences.save).toHaveBeenCalledTimes(1);
    }
  });
});

// Additional edge cases for getUserRecommendations
describe('getUserRecommendations additional cases', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should handle empty tag vectors correctly', async () => {
    // User with all zeros in preferences
    const userWithZeroPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(0),
    };
    mockingoose(UserModel).toReturn(userWithZeroPreferences, 'findById');

    // Mock a question with no tags (empty vector)
    const mockQuestion = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Question',
      text: 'Test Question Text',
      tags: [], // Empty tags array
      answers: [],
      comments: [],
      views: [],
    };

    mockingoose(QuestionModel).toReturn([mockQuestion], 'find');

    const result = await getUserRecommendations(safeUser._id.toString());

    // Should return an array with the question and similarity of 0 (as both vectors are empty/all zeros)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0); // Zero similarity when both vectors are zero
    }
  });

  it('should sort recommendations correctly, with viewed questions at the end', async () => {
    // User with some preferences values
    const userWithPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 0)), // Even indices have value 1
      username: 'test-user',
    };
    mockingoose(UserModel).toReturn(userWithPreferences, 'findById');

    // Mock questions with varying similarity and view status
    const mockQuestions = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Viewed High Similarity',
        text: 'Question Text',
        tags: [{ name: 'tag0' }, { name: 'tag2' }], // High similarity tags
        answers: [],
        comments: [],
        views: ['test-user'], // Viewed by the test user
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Unviewed Low Similarity',
        text: 'Question Text',
        tags: [{ name: 'tag1' }, { name: 'tag3' }], // Low similarity tags
        answers: [],
        comments: [],
        views: [], // Not viewed
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Unviewed High Similarity',
        text: 'Question Text',
        tags: [{ name: 'tag0' }, { name: 'tag2' }, { name: 'tag4' }], // High similarity tags
        answers: [],
        comments: [],
        views: [], // Not viewed
      },
    ];

    // Mock tagIndexMap for the test
    jest.mock(
      '@fake-stack-overflow/shared/tagIndexMap.json',
      () => ({
        tag0: 0,
        tag1: 1,
        tag2: 2,
        tag3: 3,
        tag4: 4,
      }),
      { virtual: true },
    );

    mockingoose(QuestionModel).toReturn(mockQuestions, 'find');

    const result = await getUserRecommendations(safeUser._id.toString());

    if (Array.isArray(result)) {
      // Expect the unviewed high similarity question to come first
      expect(result[0].question.title).toBe('Unviewed High Similarity');

      // Expect the viewed high similarity question to come last, despite high similarity
      expect(result[result.length - 1].question.title).toBe('Viewed High Similarity');
    }
  });

  it('should handle nonexistent tag indices gracefully', async () => {
    const userWithPreferences = {
      ...safeUser,
      preferences: new Array(1000).fill(1), // All preferences set to 1
    };
    mockingoose(UserModel).toReturn(userWithPreferences, 'findById');

    // Mock a question with a tag that doesn't exist in the tagIndexMap
    const mockQuestion = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Question with Unknown Tag',
      text: 'Question Text',
      tags: [{ name: 'nonexistent-tag' }], // Tag not in the index map
      answers: [],
      comments: [],
      views: [],
    };

    // Mock the tag index map to be empty
    jest.mock('@fake-stack-overflow/shared/tagIndexMap.json', () => ({}), { virtual: true });

    mockingoose(QuestionModel).toReturn([mockQuestion], 'find');

    // Function should still work without errors
    const result = await getUserRecommendations(safeUser._id.toString());

    if (Array.isArray(result)) {
      expect(result).toHaveLength(1);
      // Similarity will be 0 since no tags matched
      expect(result[0].similarity).toBe(0);
    }
  });
});
