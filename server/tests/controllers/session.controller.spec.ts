import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import { createServer } from 'http';
import * as sessionService from '../../services/session.service';
import { DatabaseSession, FakeSOSocket } from '../../types/types';
import sessionController from '../../controllers/session.controller';

// Mock session data
const mockSessionId = new mongoose.Types.ObjectId();
const mockSession: DatabaseSession = {
  _id: mockSessionId,
  versions: ['const x = 10;', 'const x = 20;'],
  createdBy: new mongoose.Types.ObjectId(),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
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

// Initialize the session controller with the socket
app.use('/sessions', sessionController(mockSocket));

// Create server
const httpServer = createServer(app);

// Create the test server with supertest
const testServer = supertest(httpServer);

// Setup before all tests
beforeAll(done => {
  // Start the server on a random port
  httpServer.listen(() => {
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

// Mock the session service functions
const createSessionSpy = jest.spyOn(sessionService, 'createSession');
const getSessionByIdSpy = jest.spyOn(sessionService, 'getSessionById');
const getUserSessionsSpy = jest.spyOn(sessionService, 'getUserSessions');
const addVersionToSessionSpy = jest.spyOn(sessionService, 'addVersionToSession');

describe('Session Controller Tests', () => {
  describe('POST /', () => {
    it('should create a new session successfully', async () => {
      // Mock the service function
      createSessionSpy.mockResolvedValue(mockSession);

      // Make the request
      const response = await testServer.post('/sessions').send({ username: 'testuser' });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          _id: mockSessionId.toString(),
          versions: mockSession.versions,
        }),
      );
      expect(createSessionSpy).toHaveBeenCalledWith('testuser');

      // Verify that the emit was called, but don't check the exact session object
      expect(mockEmit).toHaveBeenCalledWith(
        'sessionUpdate',
        expect.objectContaining({
          type: 'created',
        }),
      );
    });

    it('should return 400 if username is missing', async () => {
      // Make the request without username
      const response = await testServer.post('/sessions').send({});

      // Assertions
      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing username');
      expect(createSessionSpy).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 500 if session creation fails', async () => {
      // Mock service error
      createSessionSpy.mockResolvedValue({ error: 'User not found' });

      // Make the request
      const response = await testServer.post('/sessions').send({ username: 'nonexistent' });

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error creating session');
      expect(createSessionSpy).toHaveBeenCalledWith('nonexistent');
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('GET /:sessionId', () => {
    it('should retrieve a session by ID successfully', async () => {
      // Mock the service function
      getSessionByIdSpy.mockResolvedValue(mockSession);

      // Make the request
      const response = await testServer.get(`/sessions/${mockSessionId}`);

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          _id: mockSessionId.toString(),
          versions: mockSession.versions,
        }),
      );
      expect(getSessionByIdSpy).toHaveBeenCalledWith(mockSessionId.toString());
    });

    it('should return 404 if session is not found', async () => {
      // Mock service returning null or error
      getSessionByIdSpy.mockResolvedValue({ error: 'Session not found' });

      // Make the request
      const response = await testServer.get(`/sessions/${mockSessionId}`);

      // Assertions
      expect(response.status).toBe(404);
      expect(response.text).toBe('Session not found');
      expect(getSessionByIdSpy).toHaveBeenCalledWith(mockSessionId.toString());
    });

    it('should return 500 if an error occurs', async () => {
      // Mock service throwing an error
      getSessionByIdSpy.mockRejectedValue(new Error('Database error'));

      // Make the request
      const response = await testServer.get(`/sessions/${mockSessionId}`);

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error retrieving session');
      expect(getSessionByIdSpy).toHaveBeenCalledWith(mockSessionId.toString());
    });
  });

  describe('GET /:username/sessions', () => {
    it('should retrieve all sessions for a user successfully', async () => {
      // Mock the service function
      getUserSessionsSpy.mockResolvedValue([mockSession]);

      // Make the request
      const response = await testServer.get('/sessions/testuser/sessions');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          _id: mockSessionId.toString(),
          versions: mockSession.versions,
        }),
      );
      expect(getUserSessionsSpy).toHaveBeenCalledWith('testuser');
    });

    it('should return 500 if an error occurs', async () => {
      // Mock service error
      getUserSessionsSpy.mockResolvedValue({ error: 'User not found' });

      // Make the request
      const response = await testServer.get('/sessions/nonexistent/sessions');

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error retrieving user sessions');
      expect(getUserSessionsSpy).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('PATCH /:sessionId', () => {
    it('should add a version to a session successfully', async () => {
      // Mock the service function
      const updatedSession = {
        ...mockSession,
        versions: [...mockSession.versions, 'const x = 30;'],
        updatedAt: new Date(),
      };
      addVersionToSessionSpy.mockResolvedValue(updatedSession);

      // Make the request
      const response = await testServer.patch(`/sessions/${mockSessionId}`).send({
        version: 'const x = 30;',
      });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          _id: mockSessionId.toString(),
          versions: updatedSession.versions,
        }),
      );
      expect(addVersionToSessionSpy).toHaveBeenCalledWith(
        mockSessionId.toString(),
        'const x = 30;',
      );

      // Verify that the emit was called, but don't check the exact session object
      expect(mockEmit).toHaveBeenCalledWith(
        'sessionUpdate',
        expect.objectContaining({
          type: 'updated',
        }),
      );
    });

    it('should return 400 if version is missing or empty', async () => {
      // Make request with empty version
      const response = await testServer.patch(`/sessions/${mockSessionId}`).send({
        version: '',
      });

      // Assertions
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid version in request body');
      expect(addVersionToSessionSpy).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 404 if session is not found', async () => {
      // Mock service returning null or error
      addVersionToSessionSpy.mockResolvedValue({ error: 'Session not found' });

      // Make the request
      const response = await testServer.patch(`/sessions/${mockSessionId}`).send({
        version: 'const x = 30;',
      });

      // Assertions
      expect(response.status).toBe(404);
      expect(response.text).toBe('Session not found');
      expect(addVersionToSessionSpy).toHaveBeenCalledWith(
        mockSessionId.toString(),
        'const x = 30;',
      );
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should return 500 if an error occurs', async () => {
      // Mock service throwing an error
      addVersionToSessionSpy.mockRejectedValue(new Error('Database error'));

      // Make the request
      const response = await testServer.patch(`/sessions/${mockSessionId}`).send({
        version: 'const x = 30;',
      });

      // Assertions
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error updating session');
      expect(addVersionToSessionSpy).toHaveBeenCalledWith(
        mockSessionId.toString(),
        'const x = 30;',
      );
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
