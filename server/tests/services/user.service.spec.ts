import mongoose from 'mongoose';
import UserModel from '../../models/users.model';
import QuestionModel from '../../models/questions.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  getUsersList,
  loginUser,
  saveUser,
  updateUser,
  getTop10ByPoints,
  getRankForUser,
  updateUserPreferences,
  getUserRecommendations,
} from '../../services/user.service';
import { SafeDatabaseUser, User, UserCredentials } from '../../types/types';
import { user, safeUser } from '../mockData.models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('User model', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  describe('saveUser', () => {
    beforeEach(() => {
      mockingoose.resetAll();
    });

    it('should return the saved user', async () => {
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = (await saveUser(user)) as SafeDatabaseUser;

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toEqual(user.username);
      expect(savedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if error when saving to database', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockRejectedValueOnce(() => new Error('Error saving document'));

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });
  });
});

describe('getUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the matching user', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOne');

    const retrievedUser = (await getUserByUsername(user.username)) as SafeDatabaseUser;

    expect(retrievedUser.username).toEqual(user.username);
    expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding document'), 'findOne');

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });
});

describe('getUsersList', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the users', async () => {
    mockingoose(UserModel).toReturn([safeUser], 'find');

    const retrievedUsers = (await getUsersList()) as SafeDatabaseUser[];

    expect(retrievedUsers[0].username).toEqual(safeUser.username);
    expect(retrievedUsers[0].dateJoined).toEqual(safeUser.dateJoined);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding document'), 'find');

    const getUsersError = await getUsersList();

    expect('error' in getUsersError).toBe(true);
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the user if authentication succeeds', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOne');

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loggedInUser = (await loginUser(credentials)) as SafeDatabaseUser;

    expect(loggedInUser.username).toEqual(user.username);
    expect(loggedInUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should return the user if the password fails', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const credentials: UserCredentials = {
      username: user.username,
      password: 'wrongPassword',
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });

  it('should return the user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const credentials: UserCredentials = {
      username: 'wrongUsername',
      password: user.password,
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });
});

describe('deleteUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the deleted user when deleted succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOneAndDelete');

    const deletedUser = (await deleteUserByUsername(user.username)) as SafeDatabaseUser;

    expect(deletedUser.username).toEqual(user.username);
    expect(deletedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndDelete');

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
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
