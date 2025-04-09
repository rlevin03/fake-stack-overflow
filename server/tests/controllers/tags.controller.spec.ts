import supertest from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import { createServer } from 'http';
import * as tagUtil from '../../services/tag.service';
import TagModel from '../../models/tags.model';
import { DatabaseTag, Tag } from '../../types/types';
import tagController from '../../controllers/tag.controller';

const getTagCountMapSpy: jest.SpyInstance = jest.spyOn(tagUtil, 'getTagCountMap');
// Spy on the TagModel.findOne method
const findOneSpy = jest.spyOn(TagModel, 'findOne');

// Create test app with express
const app = express();
app.use(express.json());

// Initialize the tag controller
app.use('/tag', tagController());

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
});

describe('Test tagController', () => {
  describe('GET /getTagByName/:name', () => {
    it('should return the tag when found', async () => {
      // Mock a tag object to be returned by the findOne method
      const mockTag: Tag = { name: 'exampleTag', description: 'This is a test tag' };
      const mockDatabaseTag: DatabaseTag = { ...mockTag, _id: new mongoose.Types.ObjectId() };

      findOneSpy.mockResolvedValueOnce(mockDatabaseTag);

      const response = await testServer.get('/tag/getTagByName/exampleTag');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...mockDatabaseTag, _id: mockDatabaseTag._id.toString() });
    });

    it('should return 404 if the tag is not found', async () => {
      // Mock findOne to return null to simulate tag not found
      findOneSpy.mockResolvedValueOnce(null);

      const response = await testServer.get('/tag/getTagByName/nonExistentTag');

      expect(response.status).toBe(404);
      expect(response.text).toBe('Tag with name "nonExistentTag" not found');
    });

    it('should return 500 if there is an error fetching the tag', async () => {
      // Mock findOne to throw an error
      findOneSpy.mockRejectedValueOnce(new Error('Error fetching tag'));

      const response = await testServer.get('/tag/getTagByName/errorTag');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when fetching tag: Error fetching tag');
    });
  });

  describe('GET /getTagsWithQuestionNumber', () => {
    it('should return tags with question numbers', async () => {
      const mockTagCountMap = new Map<string, number>();
      mockTagCountMap.set('tag1', 2);
      mockTagCountMap.set('tag2', 1);
      getTagCountMapSpy.mockResolvedValueOnce(mockTagCountMap);

      const response = await testServer.get('/tag/getTagsWithQuestionNumber');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { name: 'tag1', qcnt: 2 },
        { name: 'tag2', qcnt: 1 },
      ]);
    });

    it('should return error 500 if getTagCountMap returns null', async () => {
      getTagCountMapSpy.mockResolvedValueOnce(null);

      const response = await testServer.get('/tag/getTagsWithQuestionNumber');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when fetching tag count map');
    });

    it('should return error 500 if getTagCountMap throws an error', async () => {
      getTagCountMapSpy.mockRejectedValueOnce(new Error('Error fetching tags'));

      const response = await testServer.get('/tag/getTagsWithQuestionNumber');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error when fetching tag count map');
    });
  });

  describe('GET /getPredefinedTags', () => {
    it('should return predefined tags list', async () => {
      const response = await testServer.get('/tag/getPredefinedTags');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // At least check that we get some tags back
      expect(response.body.length).toBeGreaterThan(0);
      // Check that each item has the expected structure
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('qcnt', 0);
    });
  });
});
