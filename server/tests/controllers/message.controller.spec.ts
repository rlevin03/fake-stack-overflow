import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import * as util from '../../services/message.service';
import { DatabaseMessage, FakeSOSocket, Message } from '../../types/types';
import messageController from '../../controllers/message.controller';

const saveMessageSpy = jest.spyOn(util, 'saveMessage');
const getMessagesSpy = jest.spyOn(util, 'getMessages');

// Create test app with express
const app = express();
let httpServer: HttpServer;
let testServer: any; // Using any temporarily to avoid supertest typing issues

// Create a proper mock that satisfies the FakeSOSocket type
const mockEmit = jest.fn();
const mockSocket = {
  emit: mockEmit,
} as unknown as FakeSOSocket;

// Setup before all tests
beforeAll(done => {
  httpServer = createServer(app);

  // Initialize the message controller with the socket
  app.use(express.json());
  app.use('/messaging', messageController(mockSocket));

  // Start the server on a random port
  httpServer.listen(0, () => {
    testServer = supertest(httpServer);
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
  mockEmit.mockClear();
});

describe('POST /addMessage', () => {
  it('should add a new message', async () => {
    const validId = new mongoose.Types.ObjectId();

    const requestMessage: Message = {
      msg: 'Hello',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
      type: 'global',
    };

    const message: DatabaseMessage = {
      ...requestMessage,
      _id: validId,
    };

    saveMessageSpy.mockResolvedValue(message);

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: requestMessage });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      _id: message._id.toString(),
      msg: message.msg,
      msgFrom: message.msgFrom,
      msgDateTime: message.msgDateTime.toISOString(),
      type: 'global',
    });

    // Verify that the socket emit was called with the correct parameters
    expect(mockEmit).toHaveBeenCalledWith('messageUpdate', {
      msg: expect.objectContaining({
        _id: expect.any(mongoose.Types.ObjectId),
        msg: 'Hello',
        msgFrom: 'User1',
        type: 'global',
      }),
    });
  });

  it('should return bad request error if messageToAdd is missing', async () => {
    const response = await testServer.post('/messaging/addMessage').send({});

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid request');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msg is empty', async () => {
    const badMessage = {
      msg: '',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msg is missing', async () => {
    const badMessage = {
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msgFrom is empty', async () => {
    const badMessage = {
      msg: 'Hello',
      msgFrom: '',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msgFrom is missing', async () => {
    const badMessage = {
      msg: 'Hello',
      msgDateTime: new Date('2024-06-04'),
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msgDateTime is missing', async () => {
    const badMessage = {
      msg: 'Hello',
      msgFrom: 'User1',
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return bad message body error if msgDateTime is null', async () => {
    const badMessage = {
      msg: 'Hello',
      msgFrom: 'User1',
      msgDateTime: null,
    };

    const response = await testServer
      .post('/messaging/addMessage')
      .send({ messageToAdd: badMessage });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Invalid message body');
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should return internal server error if saveMessage fails', async () => {
    const validId = new mongoose.Types.ObjectId();
    const message = {
      _id: validId,
      msg: 'Hello',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
    };

    saveMessageSpy.mockResolvedValue({ error: 'Error saving document' });

    const response = await testServer.post('/messaging/addMessage').send({ messageToAdd: message });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Error when adding a message: Error saving document');
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

describe('GET /getMessages', () => {
  it('should return all messages', async () => {
    const message1: Message = {
      msg: 'Hello',
      msgFrom: 'User1',
      msgDateTime: new Date('2024-06-04'),
      type: 'global',
    };

    const message2: Message = {
      msg: 'Hi',
      msgFrom: 'User2',
      msgDateTime: new Date('2024-06-05'),
      type: 'global',
    };

    const dbMessage1: DatabaseMessage = {
      ...message1,
      _id: new mongoose.Types.ObjectId(),
    };

    const dbMessage2: DatabaseMessage = {
      ...message2,
      _id: new mongoose.Types.ObjectId(),
    };

    getMessagesSpy.mockResolvedValue([dbMessage1, dbMessage2]);

    const response = await testServer.get('/messaging/getMessages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        ...dbMessage1,
        _id: dbMessage1._id.toString(),
        msgDateTime: dbMessage1.msgDateTime.toISOString(),
      },
      {
        ...dbMessage2,
        _id: dbMessage2._id.toString(),
        msgDateTime: dbMessage2.msgDateTime.toISOString(),
      },
    ]);
  });
});
