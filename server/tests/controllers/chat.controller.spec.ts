import mongoose from 'mongoose';
import supertest from 'supertest';
import { Server } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';
import express from 'express';
import chatController from '../../controllers/chat.controller';
import * as messageService from '../../services/message.service';
import * as chatService from '../../services/chat.service';
import * as databaseUtil from '../../utils/database.util';
import { DatabaseChat, PopulatedDatabaseChat, Message, FakeSOSocket } from '../../types/types';

/**
 * Spies on the service functions
 */
const saveChatSpy = jest.spyOn(chatService, 'saveChat');
const saveMessageSpy = jest.spyOn(messageService, 'saveMessage');
const addMessageSpy = jest.spyOn(chatService, 'addMessageToChat');
const getChatSpy = jest.spyOn(chatService, 'getChat');
const addParticipantSpy = jest.spyOn(chatService, 'addParticipantToChat');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const getChatsByParticipantsSpy = jest.spyOn(chatService, 'getChatsByParticipants');

// Create test app with express
const app = express();
app.use(express.json());

// Create socket.io server for chat controller
const server = createServer(app);
const io = new Server(server);

// Initialize the chat controller with the socket
app.use('/chat', chatController(io));

// Create the test server instance
const testServer = supertest(server);

// Setup before all tests
beforeAll(done => {
  // Start the server on a random port
  server.listen(0, () => {
    done();
  });
});

// Cleanup after all tests
afterAll(done => {
  if (server) {
    server.close(done);
  } else {
    done();
  }
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Sample test suite for the /chat endpoints
 */
describe('Chat Controller', () => {
  describe('POST /chat/createChat', () => {
    it('should create a new chat successfully', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const serializedPayload = {
        ...validChatPayload,
        messages: validChatPayload.messages.map(message => ({
          ...message,
          type: 'direct',
          msgDateTime: message.msgDateTime.toISOString(),
        })),
      };

      const chatResponse: DatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const populatedChatResponse: PopulatedDatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [
          {
            _id: chatResponse.messages[0],
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(populatedChatResponse);

      const response = await testServer.post('/chat/createChat').send(validChatPayload);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: populatedChatResponse._id.toString(),
        participants: populatedChatResponse.participants.map(participant => participant.toString()),
        messages: populatedChatResponse.messages.map(message => ({
          ...message,
          _id: message._id.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: populatedChatResponse.createdAt.toISOString(),
        updatedAt: populatedChatResponse.updatedAt.toISOString(),
      });

      // Update expected value to match serialization
      expect(saveChatSpy).toHaveBeenCalledWith(serializedPayload);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id.toString(), 'chat');
    });

    it('should return 400 if participants array is invalid', async () => {
      const invalidPayload = {
        participants: [],
        messages: [],
      };

      const response = await testServer.post('/chat/createChat').send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid chat creation request');
    });

    it('should return 500 on service error', async () => {
      saveChatSpy.mockResolvedValue({ error: 'Service error' });

      const response = await testServer.post('/chat/createChat').send({
        participants: ['user1'],
        messages: [],
      });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error creating a chat: Service error');
    });
  });

  describe('POST /chat/:chatId/addMessage', () => {
    it('should add a message to chat successfully', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const serializedPayload = {
        ...messagePayload,
        msgDateTime: messagePayload.msgDateTime.toISOString(),
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        ...messagePayload,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      const chatResponse: DatabaseChat = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse._id],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const populatedChatResponse: PopulatedDatabaseChat = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      saveMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(populatedChatResponse);

      const response = await testServer.post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: populatedChatResponse._id.toString(),
        participants: populatedChatResponse.participants.map(participant => participant.toString()),
        messages: populatedChatResponse.messages.map(message => ({
          ...message,
          _id: message._id.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: populatedChatResponse.createdAt.toISOString(),
        updatedAt: populatedChatResponse.updatedAt.toISOString(),
      });

      expect(saveMessageSpy).toHaveBeenCalledWith(serializedPayload);
      expect(addMessageSpy).toHaveBeenCalledWith(chatId.toString(), messageResponse._id.toString());
      expect(populateDocumentSpy).toHaveBeenCalledWith(
        populatedChatResponse._id.toString(),
        'chat',
      );
    });

    it('should return 400 for missing chatId, msg, or msgFrom', async () => {
      const chatId = new mongoose.Types.ObjectId();

      // Test missing msg
      const missingMsg = {
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
      };
      const response1 = await testServer.post(`/chat/${chatId}/addMessage`).send(missingMsg);
      expect(response1.status).toBe(400);

      // Test missing msgFrom
      const missingFrom = {
        msg: 'Hello!',
        msgDateTime: new Date('2025-01-01'),
      };
      const response2 = await testServer.post(`/chat/${chatId}/addMessage`).send(missingFrom);
      expect(response2.status).toBe(400);
    });

    it('should return 500 if addMessageToChat returns an error', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();

      // 1) Mock `createMessage` to succeed
      saveMessageSpy.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        msg: 'Hello',
        msgFrom: 'UserX',
        msgDateTime: new Date(),
        type: 'direct',
      });

      // 2) Mock `addMessageToChat` to return an error object
      addMessageSpy.mockResolvedValue({ error: 'Error updating chat' });

      // 3) Invoke the endpoint with valid body
      const response = await testServer.post(`/chat/${chatId}/addMessage`).send({
        msg: 'Hello',
        msgFrom: 'UserX',
        msgDateTime: new Date().toISOString(),
      });

      // 4) Expect a 500 with the error message
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error updating chat');
    });

    it('should throw an error if message creation fails and does not return an _id', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messagePayload: Message = {
        msg: 'Hello',
        msgFrom: 'User1',
        msgDateTime: new Date(),
        type: 'direct',
      };

      // Mock createMessageSpy to return an object with _id as undefined
      saveMessageSpy.mockResolvedValue({ error: 'Error saving message' });

      const response = await testServer.post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error adding a message to chat: Error saving message');
    });

    it('should throw an error if updatedChat returns an error', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messagePayload = { msg: 'Hello', msgFrom: 'User1', msgDateTime: new Date() };
      const mockMessage = {
        _id: new mongoose.Types.ObjectId(),
        type: 'direct' as 'direct' | 'global',
        ...messagePayload,
      };

      // Mock the successful creation of the message
      saveMessageSpy.mockResolvedValueOnce(mockMessage);

      // Mock the failure of updating the chat (addMessageToChat scenario)
      addMessageSpy.mockResolvedValueOnce({ error: 'Error updating chat' });

      // Call the endpoint
      const response = await testServer.post(`/chat/${chatId}/addMessage`).send(messagePayload);

      // Validate the response
      expect(response.status).toBe(500);
      expect(response.text).toContain('Error adding a message to chat: Error updating chat');
    });

    it('should return 500 if populateDocument returns an error', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const foundChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'], // Array of ObjectIds
        messages: [], // Array of ObjectIds
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the getChat service to return a valid chat
      getChatSpy.mockResolvedValue(foundChat);

      // Mock populateDocument to return an error
      populateDocumentSpy.mockResolvedValue({ error: 'Error populating chat' });

      const response = await testServer.get(`/chat/${chatId}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain('Error populating chat');
      expect(getChatSpy).toHaveBeenCalledWith(chatId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(foundChat._id.toString(), 'chat');
    });

    it('should return 500 if createMessage returns an error', async () => {
      saveMessageSpy.mockResolvedValue({ error: 'Service error' });

      const chatId = new mongoose.Types.ObjectId().toString();
      const messagePayload = { msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date() };

      const response = await testServer.post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error adding a message to chat: Service error');
    });
  });

  describe('GET /chat/:chatId', () => {
    it('should retrieve a chat by ID', async () => {
      // 1) Prepare a valid chatId param
      const chatId = new mongoose.Types.ObjectId().toString();

      // 2) Mock a fully enriched chat
      const mockFoundChat: DatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPopulatedChat: PopulatedDatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3) Mock the service calls
      getChatSpy.mockResolvedValue(mockFoundChat);
      populateDocumentSpy.mockResolvedValue(mockPopulatedChat);

      // 4) Invoke the endpoint
      const response = await testServer.get(`/chat/${chatId}`);

      // 5) Assertions
      expect(response.status).toBe(200);
      expect(getChatSpy).toHaveBeenCalledWith(chatId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(mockFoundChat._id.toString(), 'chat');

      // Convert ObjectIds and Dates for comparison
      expect(response.body).toMatchObject({
        _id: mockPopulatedChat._id.toString(),
        participants: mockPopulatedChat.participants.map(p => p.toString()),
        messages: mockPopulatedChat.messages.map(m => ({
          _id: m._id.toString(),
          msg: m.msg,
          msgFrom: m.msgFrom,
          msgDateTime: m.msgDateTime.toISOString(),
          user: {
            _id: m.user?._id.toString(),
            username: m.user?.username,
          },
        })),
        createdAt: mockPopulatedChat.createdAt.toISOString(),
        updatedAt: mockPopulatedChat.updatedAt.toISOString(),
      });
    });

    it('should return 500 if getChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      getChatSpy.mockResolvedValue({ error: 'Service error' });

      const response = await testServer.get(`/chat/${chatId}`);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving chat: Service error');
    });
  });

  describe('POST /chat/:chatId/addParticipant', () => {
    it('should add a participant to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updatedChat: DatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const populatedUpdatedChat: PopulatedDatabaseChat = {
        _id: updatedChat._id,
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addParticipantSpy.mockResolvedValue(updatedChat);
      populateDocumentSpy.mockResolvedValue(populatedUpdatedChat);

      const response = await testServer
        .post(`/chat/${chatId}/addParticipant`)
        .send({ username: userId });

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: populatedUpdatedChat._id.toString(),
        participants: populatedUpdatedChat.participants.map(id => id.toString()),
        messages: [],
        createdAt: populatedUpdatedChat.createdAt.toISOString(),
        updatedAt: populatedUpdatedChat.updatedAt.toISOString(),
      });

      expect(addParticipantSpy).toHaveBeenCalledWith(chatId, userId);
    });

    it('should return 400 if userId is missing', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const response = await testServer.post(`/chat/${chatId}/addParticipant`).send({}); // Missing userId

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing chatId or userId');
    });

    it('should return 500 if addParticipantToChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      addParticipantSpy.mockResolvedValue({ error: 'Service error' });

      const response = await testServer
        .post(`/chat/${chatId}/addParticipant`)
        .send({ username: userId });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error adding participant to chat: Service error');
    });
  });

  describe('POST /chat/getChatsByUser/:username', () => {
    it('should return 200 with an array of chats', async () => {
      const username = 'user1';

      const chats: DatabaseChat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const populatedChats: PopulatedDatabaseChat[] = [
        {
          _id: chats[0]._id,
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce(populatedChats[0]);

      const response = await testServer.get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(populatedChats[0]._id.toString(), 'chat');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([
        {
          _id: populatedChats[0]._id.toString(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: populatedChats[0].createdAt.toISOString(),
          updatedAt: populatedChats[0].updatedAt.toISOString(),
        },
      ]);
    });

    it('should return 500 if populateDocument fails for any chat', async () => {
      const username = 'user1';
      const chats: DatabaseChat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce({ error: 'Service error' });

      const response = await testServer.get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id.toString(), 'chat');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving chat: Failed populating all retrieved chats');
    });
  });

  describe('Socket handlers', () => {
    let socketServer: FakeSOSocket;
    let clientSocket: ClientSocket;
    let socketHttpServer: HttpServer;

    beforeAll(done => {
      // Create separate server for socket tests
      socketHttpServer = createServer();
      socketServer = new Server(socketHttpServer) as FakeSOSocket;

      // Attach chat controller to the socket server
      chatController(socketServer);

      // Start the server on a random port
      socketHttpServer.listen(() => {
        const { port } = socketHttpServer.address() as AddressInfo;
        // Connect the client socket
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', done);
      });
    });

    afterAll(done => {
      if (clientSocket) {
        clientSocket.disconnect();
      }

      if (socketServer) {
        socketServer.close();
      }

      if (socketHttpServer) {
        socketHttpServer.close(done);
      } else {
        done();
      }
    });

    it('should join a chat room when "joinChat" event is emitted', done => {
      // Listen for joinChat event
      const chatId = 'chat123';

      clientSocket.emit('joinChat', chatId);

      // Wait for the next tick to verify the room
      setTimeout(() => {
        // Check if the client is in room
        const clientInRoom = socketServer.sockets.adapter.rooms.has(chatId);
        expect(clientInRoom).toBeTruthy();
        done();
      }, 100);
    });

    it('should leave a chat room when "leaveChat" event is emitted', done => {
      // Listen for leaveChat event
      const chatId = 'chat456';

      // First join the room
      clientSocket.emit('joinChat', chatId);

      // Wait a bit to ensure joined
      setTimeout(() => {
        // Then leave the room
        clientSocket.emit('leaveChat', chatId);

        // Check if left the room
        setTimeout(() => {
          // The room should either not exist or not have the client
          const hasRoom = socketServer.sockets.adapter.rooms.has(chatId);
          const roomClients = socketServer.sockets.adapter.rooms.get(chatId);
          const clientId = clientSocket.id || '';
          const inRoom = hasRoom && roomClients && roomClients.has(clientId);
          expect(inRoom).toBeFalsy();
          done();
        }, 100);
      }, 100);
    });
  });
});
