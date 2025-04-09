import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import { createServer } from 'http';
import * as badgeService from '../../services/badge.service';
import { DatabaseBadge } from '../../types/types';
import badgeController from '../../controllers/badge.controller';

// Create mock badges for testing
const MOCK_BADGES: DatabaseBadge[] = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Curious Cat',
    description: 'Asked 10+ questions that received at least one upvote.',
    progress: 10,
    attained: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Helping Hand',
    description: 'Provided 5+ answers',
    progress: 5,
    attained: true,
  },
];

// Create test app with express
const app = express();
app.use(express.json());
app.use('/badge', badgeController());

const httpServer = createServer(app);
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
  if (httpServer) {
    httpServer.close(done);
  } else {
    done();
  }
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock the badge service
const getBadgesByIdsSpy = jest.spyOn(badgeService, 'getBadgesByIds');

describe('Test badgeController', () => {
  describe('GET /badges', () => {
    it('should return badges when valid badge IDs are provided', async () => {
      const badgeIds = MOCK_BADGES.map(badge => badge._id.toString());

      // Mock the getBadgesByIds service function
      getBadgesByIdsSpy.mockResolvedValue(MOCK_BADGES);

      const response = await testServer.get('/badge/badges').query({ badgeIds });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Curious Cat');
      expect(response.body[1].name).toBe('Helping Hand');
      expect(getBadgesByIdsSpy).toHaveBeenCalledWith(badgeIds);
    });

    it('should return 400 when badge IDs are not provided', async () => {
      const response = await testServer.get('/badge/badges');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Badge IDs are required' });
      expect(getBadgesByIdsSpy).not.toHaveBeenCalled();
    });

    it('should return 400 when badge IDs are not in an array', async () => {
      const response = await testServer.get('/badge/badges').query({ badgeIds: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Badge IDs are required' });
      expect(getBadgesByIdsSpy).not.toHaveBeenCalled();
    });

    it('should return 500 when the badge service throws an error', async () => {
      const badgeIds = MOCK_BADGES.map(badge => badge._id.toString());

      // Mock the getBadgesByIds service function to throw an error
      getBadgesByIdsSpy.mockRejectedValue(new Error('Database error'));

      const response = await testServer.get('/badge/badges').query({ badgeIds });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Database error' });
      expect(getBadgesByIdsSpy).toHaveBeenCalledWith(badgeIds);
    });

    it('should return 500 with generic error message for unknown errors', async () => {
      const badgeIds = MOCK_BADGES.map(badge => badge._id.toString());

      // Mock the getBadgesByIds service function to throw a non-Error object
      getBadgesByIdsSpy.mockRejectedValue('Unknown error');

      const response = await testServer.get('/badge/badges').query({ badgeIds });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'An unknown error occurred' });
      expect(getBadgesByIdsSpy).toHaveBeenCalledWith(badgeIds);
    });

    it('should return empty array when no badges are found', async () => {
      const badgeIds = ['nonexistent-id-1', 'nonexistent-id-2'];

      // Mock the getBadgesByIds service function to return empty array
      getBadgesByIdsSpy.mockResolvedValue([]);

      const response = await testServer.get('/badge/badges').query({ badgeIds });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(getBadgesByIdsSpy).toHaveBeenCalledWith(badgeIds);
    });
  });
});
