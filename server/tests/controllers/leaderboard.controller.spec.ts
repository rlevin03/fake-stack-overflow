import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Socket, io as ioc } from 'socket.io-client';
import { AddressInfo } from 'net';
import * as userService from '../../services/user.service';
import { SafeDatabaseUser } from '../../types/types';
import leaderboardController from '../../controllers/leaderboard.controller';

// Create test app with express
const app = express();
app.use(express.json());

// Setup HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const ioServer = new SocketIOServer(httpServer);

// Initialize the leaderboard controller with the socket
app.use('/leaderboard', leaderboardController(ioServer));

// Create the test server with supertest
const testServer = supertest(httpServer);

// Variables for socket tests
let clientSocket: Socket;
let clientSocketURL: string;

// Mock user data for testing
const MOCK_USERS: SafeDatabaseUser[] = [
  {
    _id: new mongoose.Types.ObjectId(),
    username: 'user1',
    dateJoined: new Date('2023-01-01'),
    points: 100,
    badges: [],
    preferences: [],
    aiToggler: true,
    pointsHistory: ['Earned 100 points'],
    hideRanking: false,
    lastActive: new Date(),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    username: 'user2',
    dateJoined: new Date('2023-01-02'),
    points: 80,
    badges: [],
    preferences: [],
    aiToggler: true,
    pointsHistory: ['Earned 80 points'],
    hideRanking: false,
    lastActive: new Date(),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    username: 'user3',
    dateJoined: new Date('2023-01-03'),
    points: 60,
    badges: [],
    preferences: [],
    aiToggler: true,
    pointsHistory: ['Earned 60 points'],
    hideRanking: false,
    lastActive: new Date(),
  },
];

// Setup before all tests
beforeAll(done => {
  // Start the server on a random port
  httpServer.listen(() => {
    const address = httpServer.address() as AddressInfo;
    clientSocketURL = `http://localhost:${address.port}`;

    // Create client socket
    clientSocket = ioc(clientSocketURL);

    done();
  });
});

// Cleanup after all tests
afterAll(done => {
  if (clientSocket.connected) {
    clientSocket.disconnect();
  }
  ioServer.close();
  httpServer.close(done);
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Remove all listeners to prevent interference between tests
  clientSocket.removeAllListeners('top10Response');
  clientSocket.removeAllListeners('userRankResponse');
  clientSocket.removeAllListeners('error');
});

// Mock the user service functions
const getTop10ByPointsSpy = jest.spyOn(userService, 'getTop10ByPoints');
const getRankForUserSpy = jest.spyOn(userService, 'getRankForUser');

describe('Leaderboard Controller Tests', () => {
  // Test REST endpoints
  describe('REST Endpoints', () => {
    describe('GET /top10', () => {
      it('should return top 10 users by points', async () => {
        // Mock the service function
        getTop10ByPointsSpy.mockResolvedValue(MOCK_USERS);

        // Make the request
        const response = await testServer.get('/leaderboard/top10');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
        expect(response.body[0].username).toBe('user1');
        expect(response.body[0].points).toBe(100);
        expect(getTop10ByPointsSpy).toHaveBeenCalled();
      });

      it('should handle errors from the service', async () => {
        // Mock service error
        getTop10ByPointsSpy.mockResolvedValue({ error: 'Database error' });

        // Make the request
        const response = await testServer.get('/leaderboard/top10');

        // Assertions
        expect(response.status).toBe(500);
        expect(response.text).toContain('Error when getting top 10: Database error');
        expect(getTop10ByPointsSpy).toHaveBeenCalled();
      });
    });

    describe('GET /user-rank', () => {
      it('should return the rank for a given username', async () => {
        // Mock the service function
        getRankForUserSpy.mockResolvedValue({ rank: 2 });

        // Make the request
        const response = await testServer.get('/leaderboard/user-rank?username=user2');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ rank: 2 });
        expect(getRankForUserSpy).toHaveBeenCalledWith('user2');
      });

      it('should return 400 if username is missing', async () => {
        // Make the request without username
        const response = await testServer.get('/leaderboard/user-rank');

        // Assertions
        expect(response.status).toBe(400);
        expect(response.text).toContain('Invalid or missing username');
        expect(getRankForUserSpy).not.toHaveBeenCalled();
      });

      it('should handle errors from the service', async () => {
        // Mock service error
        getRankForUserSpy.mockResolvedValue({ error: 'User not found' });

        // Make the request
        const response = await testServer.get('/leaderboard/user-rank?username=unknown');

        // Assertions
        expect(response.status).toBe(500);
        expect(response.text).toContain('Error when getting user rank: User not found');
        expect(getRankForUserSpy).toHaveBeenCalledWith('unknown');
      });
    });
  });

  // Test WebSocket event handlers
  describe('WebSocket Event Handlers', () => {
    it('should handle getTop10 event', done => {
      // Mock the service function
      getTop10ByPointsSpy.mockResolvedValue(MOCK_USERS);

      // Mock client socket to handle response
      clientSocket.on('top10Response', data => {
        expect(data).toHaveLength(3);
        expect(data[0].username).toBe('user1');
        expect(data[0].points).toBe(100);
        expect(getTop10ByPointsSpy).toHaveBeenCalled();
        done();
      });

      // Emit the event to get top 10
      clientSocket.emit('getTop10');
    });

    it('should handle getUserRank event', done => {
      // Mock the service function
      getRankForUserSpy.mockResolvedValue({ rank: 3 });

      // Mock client socket to handle response
      clientSocket.on('userRankResponse', data => {
        expect(data).toEqual({ rank: 3 });
        expect(getRankForUserSpy).toHaveBeenCalledWith('user3');
        done();
      });

      // Emit the event to get user rank
      clientSocket.emit('getUserRank', { username: 'user3' });
    });

    it('should handle getUserRank event with missing username', done => {
      // Mock client socket to handle error
      clientSocket.on('error', errorMsg => {
        expect(errorMsg).toContain('Missing username');
        expect(getRankForUserSpy).not.toHaveBeenCalled();
        done();
      });

      // Emit the event without username
      clientSocket.emit('getUserRank', {});
    });

    it('should handle errors from getTop10', done => {
      // Mock service error
      getTop10ByPointsSpy.mockResolvedValue({ error: 'Database error' });

      // Mock client socket to handle error
      clientSocket.on('error', errorMsg => {
        expect(errorMsg).toContain('Error when getting top 10: Database error');
        expect(getTop10ByPointsSpy).toHaveBeenCalled();
        done();
      });

      // Emit the event to get top 10
      clientSocket.emit('getTop10');
    });

    it('should handle errors from getUserRank', done => {
      // Mock service error
      getRankForUserSpy.mockResolvedValue({ error: 'User not found' });

      // Mock client socket to handle error
      clientSocket.on('error', errorMsg => {
        expect(errorMsg).toContain('Error when getting user rank: User not found');
        expect(getRankForUserSpy).toHaveBeenCalledWith('unknown');
        done();
      });

      // Emit the event with unknown username
      clientSocket.emit('getUserRank', { username: 'unknown' });
    });
  });
});
