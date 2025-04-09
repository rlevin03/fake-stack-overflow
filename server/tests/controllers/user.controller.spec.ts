import supertest from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { createServer } from 'http';
import * as util from '../../services/user.service';
import { FakeSOSocket, SafeDatabaseUser, User } from '../../types/types';
import userController from '../../controllers/user.controller';

const mockUser: User = {
  username: 'user1',
  password: 'password',
  dateJoined: new Date('2024-12-03'),
  badges: [],
  preferences: [],
  aiToggler: false,
  pointsHistory: [],
  hideRanking: false,
  lastActive: new Date(),
};

const mockSafeUser: SafeDatabaseUser = {
  _id: new mongoose.Types.ObjectId(),
  username: 'user1',
  dateJoined: new Date('2024-12-03'),
  points: 0,
  badges: [],
  preferences: [],
  aiToggler: false,
  pointsHistory: [],
  hideRanking: false,
  lastActive: new Date(),
};

const mockUserJSONResponse = {
  _id: mockSafeUser._id.toString(),
  username: 'user1',
  dateJoined: new Date('2024-12-03').toISOString(),
  points: 0,
  badges: [],
  preferences: [],
  aiToggler: false,
  pointsHistory: [],
  hideRanking: false,
  lastActive: mockSafeUser.lastActive.toISOString(),
};

// Create test app with express
const app = express();
app.use(express.json());

// Create a proper mock for socket methods
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnThis();
const mockSocket = {
  emit: mockEmit,
  to: mockTo,
} as unknown as FakeSOSocket;

// Initialize the user controller with the socket
app.use('/user', userController(mockSocket));

// Create HTTP server
const httpServer = createServer(app);

// Create the test server with supertest
const testServer = supertest(httpServer);

// Setup before all tests
beforeAll(done => {
  // Start the server on a random port
  httpServer.listen(0, () => {
    done();
  });
});

// Cleanup after all tests
afterAll(done => {
  httpServer.close(done);
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockEmit.mockClear();
  mockTo.mockClear();
});

const saveUserSpy = jest.spyOn(util, 'saveUser');
const loginUserSpy = jest.spyOn(util, 'loginUser');
const updatedUserSpy = jest.spyOn(util, 'updateUser');
const getUserByUsernameSpy = jest.spyOn(util, 'getUserByUsername');
const getUsersListSpy = jest.spyOn(util, 'getUsersList');
const deleteUserByUsernameSpy = jest.spyOn(util, 'deleteUserByUsername');
const getTop10ByPointsSpy = jest.spyOn(util, 'getTop10ByPoints');
const getRankForUserSpy = jest.spyOn(util, 'getRankForUser');
const getPointsHistorySpy = jest.spyOn(util, 'getPointsHistory');

describe('Test userController', () => {
  describe('POST /signup', () => {
    it('should create a new user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
        biography: 'This is a test biography',
      };

      const updatedUser = {
        ...mockSafeUser,
        biography: mockReqBody.biography,
        lastActive: mockSafeUser.lastActive,
      };

      saveUserSpy.mockResolvedValue(updatedUser);

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockUserJSONResponse,
        biography: mockReqBody.biography,
      });
      expect(saveUserSpy).toHaveBeenCalledWith({
        ...mockReqBody,
        biography: mockReqBody.biography,
        dateJoined: expect.any(Date),
        preferences: expect.any(Array),
        badges: expect.any(Array),
        aiToggler: expect.any(Boolean),
        pointsHistory: expect.any(Array),
        hideRanking: expect.any(Boolean),
        lastActive: expect.any(Date),
      });
      expect(mockEmit).toHaveBeenCalledWith('userUpdate', {
        user: expect.objectContaining({ username: mockUser.username }),
        type: 'created',
      });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 500 for a database error while saving', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      saveUserSpy.mockResolvedValue({ error: 'Error saving user' });

      const response = await testServer.post('/user/signup').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('POST /login', () => {
    it('should succesfully login for a user given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      loginUserSpy.mockResolvedValue(mockSafeUser);

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(loginUserSpy).toHaveBeenCalledWith(mockReqBody);
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: mockUser.password,
      };

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: mockUser.password,
      };

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 500 for a database error while saving', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: mockUser.password,
      };

      loginUserSpy.mockResolvedValue({ error: 'Error authenticating user' });

      const response = await testServer.post('/user/login').send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /resetPassword', () => {
    it('should succesfully return updated user object given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      updatedUserSpy.mockResolvedValue(mockSafeUser);

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockUserJSONResponse });
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, { password: 'newPassword' });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        password: 'newPassword',
      };

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        password: 'newPassword',
      };

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request missing password', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 400 for request with empty password', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: '',
      };

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
    });

    it('should return 500 for a database error while updating', async () => {
      const mockReqBody = {
        username: mockUser.username,
        password: 'newPassword',
      };

      updatedUserSpy.mockResolvedValue({ error: 'Error updating user' });

      const response = await testServer.patch('/user/resetPassword').send(mockReqBody);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /getUser', () => {
    it('should return the user given correct arguments', async () => {
      getUserByUsernameSpy.mockResolvedValue(mockSafeUser);

      const response = await testServer.get(`/user/getUser/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
    });

    it('should return 500 if database error while searching username', async () => {
      getUserByUsernameSpy.mockResolvedValue({ error: 'Error finding user' });

      const response = await testServer.get(`/user/getUser/${mockUser.username}`);

      expect(response.status).toBe(500);
    });

    it('should return 404 if username not provided', async () => {
      // Express automatically returns 404 for missing parameters when
      // defined as required in the route
      const response = await testServer.get('/user/getUser/');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /getUsers', () => {
    it('should return the users from the database', async () => {
      getUsersListSpy.mockResolvedValue([mockSafeUser]);

      const response = await testServer.get(`/user/getUsers`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([mockUserJSONResponse]);
      expect(getUsersListSpy).toHaveBeenCalled();
    });

    it('should return 500 if database error while finding users', async () => {
      getUsersListSpy.mockResolvedValue({ error: 'Error finding users' });

      const response = await testServer.get(`/user/getUsers`);

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /deleteUser', () => {
    it('should return the deleted user given correct arguments', async () => {
      deleteUserByUsernameSpy.mockResolvedValue(mockSafeUser);

      const response = await testServer.delete(`/user/deleteUser/${mockUser.username}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      expect(deleteUserByUsernameSpy).toHaveBeenCalledWith(mockUser.username);
      expect(mockEmit).toHaveBeenCalledWith('userUpdate', {
        user: expect.objectContaining({ username: mockUser.username }),
        type: 'deleted',
      });
    });

    it('should return 500 if database error while searching username', async () => {
      deleteUserByUsernameSpy.mockResolvedValue({ error: 'Error deleting user' });

      const response = await testServer.delete(`/user/deleteUser/${mockUser.username}`);

      expect(response.status).toBe(500);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 404 if username not provided', async () => {
      // Express automatically returns 404 for missing parameters when
      // defined as required in the route
      const response = await testServer.delete('/user/deleteUser/');
      expect(response.status).toBe(404);
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /updateBiography', () => {
    it('should successfully update biography given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        biography: 'This is my new bio',
      };

      // Mock a successful updateUser call
      updatedUserSpy.mockResolvedValue(mockSafeUser);

      const response = await testServer.patch('/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUserJSONResponse);
      // Ensure updateUser is called with the correct args
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, {
        biography: 'This is my new bio',
      });
      expect(mockEmit).toHaveBeenCalledWith('userUpdate', {
        user: expect.objectContaining({ username: mockUser.username }),
        type: 'updated',
      });
    });

    it('should return 400 for request missing username', async () => {
      const mockReqBody = {
        biography: 'some new biography',
      };

      const response = await testServer.patch('/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for request with empty username', async () => {
      const mockReqBody = {
        username: '',
        biography: 'a new bio',
      };

      const response = await testServer.patch('/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for request missing biography field', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await testServer.patch('/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(response.text).toEqual('Invalid user body');
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 500 if updateUser returns an error', async () => {
      const mockReqBody = {
        username: mockUser.username,
        biography: 'Attempting update biography',
      };

      // Simulate a DB error
      updatedUserSpy.mockResolvedValue({ error: 'Error updating user' });

      const response = await testServer.patch('/user/updateBiography').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(response.text).toContain(
        'Error when updating user biography: Error: Error updating user',
      );
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('GET /top10', () => {
    it('should return the top 10 users by points', async () => {
      const topUsers = [
        { ...mockSafeUser, points: 100 },
        { ...mockSafeUser, _id: new mongoose.Types.ObjectId(), username: 'user2', points: 80 },
      ];

      getTop10ByPointsSpy.mockResolvedValue(topUsers);

      const response = await testServer.get('/user/top10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].points).toBe(100);
      expect(getTop10ByPointsSpy).toHaveBeenCalled();
    });

    it('should return 500 if getTop10ByPoints returns an error', async () => {
      getTop10ByPointsSpy.mockResolvedValue({ error: 'Error getting top users' });

      const response = await testServer.get('/user/top10');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /leaderboard/user-rank', () => {
    it('should return the rank of a user', async () => {
      const rank = { rank: 5 };
      getRankForUserSpy.mockResolvedValue(rank);

      const response = await testServer.get('/user/leaderboard/user-rank?username=user1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(rank);
      expect(getRankForUserSpy).toHaveBeenCalledWith('user1');
    });

    it('should return 400 if username is missing', async () => {
      const response = await testServer.get('/user/leaderboard/user-rank');

      expect(response.status).toBe(400);
    });

    it('should return 500 if getRankForUser returns an error', async () => {
      getRankForUserSpy.mockResolvedValue({ error: 'Error getting rank' });

      const response = await testServer.get('/user/leaderboard/user-rank?username=user1');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /pointsHistory/:username', () => {
    it('should return the points history for a user', async () => {
      const history = ['Earned 10 points', 'Earned 5 points'];
      getPointsHistorySpy.mockResolvedValue(history);

      const response = await testServer.get('/user/pointsHistory/user1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(history);
      expect(getPointsHistorySpy).toHaveBeenCalledWith('user1');
    });

    it('should return 500 if getPointsHistory returns an error', async () => {
      getPointsHistorySpy.mockResolvedValue({ error: 'Error getting history' });

      const response = await testServer.get('/user/pointsHistory/user1');

      expect(response.status).toBe(500);
    });

    it('should return 404 if username parameter is missing', async () => {
      const response = await testServer.get('/user/pointsHistory/');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /updateAIToggler', () => {
    it('should successfully update AI toggler given correct arguments', async () => {
      const mockReqBody = {
        username: mockUser.username,
        aiToggler: true,
      };

      updatedUserSpy.mockResolvedValue({ ...mockSafeUser, aiToggler: true });

      const response = await testServer.patch('/user/updateAIToggler').send(mockReqBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockUserJSONResponse, aiToggler: true });
      expect(updatedUserSpy).toHaveBeenCalledWith(mockUser.username, { aiToggler: true });
      expect(mockEmit).toHaveBeenCalledWith('userUpdate', {
        user: expect.objectContaining({
          username: mockUser.username,
          aiToggler: true,
        }),
        type: 'updated',
      });
    });

    it('should return 400 for missing username', async () => {
      const mockReqBody = {
        aiToggler: true,
      };

      const response = await testServer.patch('/user/updateAIToggler').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 400 for missing aiToggler', async () => {
      const mockReqBody = {
        username: mockUser.username,
      };

      const response = await testServer.patch('/user/updateAIToggler').send(mockReqBody);

      expect(response.status).toBe(400);
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 500 if updateUser returns an error', async () => {
      const mockReqBody = {
        username: mockUser.username,
        aiToggler: false,
      };

      updatedUserSpy.mockResolvedValue({ error: 'Error updating AI toggler' });

      const response = await testServer.patch('/user/updateAIToggler').send(mockReqBody);

      expect(response.status).toBe(500);
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
