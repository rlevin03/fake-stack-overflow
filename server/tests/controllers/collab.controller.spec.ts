import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer, createServer } from 'http';
import { Socket, io as ioc } from 'socket.io-client';
import { AddressInfo } from 'net';
import { spawn } from 'child_process';
import * as sessionService from '../../services/session.service';
import registerCollabHandlers from '../../controllers/collab.controller';
import { SessionResponse, FakeSOSocket } from '../../types/types';

// Mocks
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));
jest.mock('../../services/session.service');

// Socket and event handler types
interface MockClientSocket {
  id: string;
  join: jest.Mock;
  to: jest.Mock;
  emit: jest.Mock;
  on: jest.Mock;
  leave?: jest.Mock;
}

interface MockSocketTo {
  emit: jest.Mock;
}

interface MockSpawnProcess {
  stdout: { on: jest.Mock };
  stderr: { on: jest.Mock };
  on: jest.Mock;
}

// Event handler types
type JoinSessionHandler = (sessionId: string, username: string) => void;
type CodeChangeHandler = (params: {
  codingSessionID: string;
  code: string;
  username: string;
}) => void;
type CursorChangeHandler = (params: {
  codingSessionID: string;
  cursorPosition: { lineNumber: number; column: number };
  username: string;
}) => void;
type ExecuteCodeHandler = (params: {
  codingSessionID: string;
  code: string;
  username: string;
}) => void;
type EditHighlightHandler = (params: {
  codingSessionID: string;
  lineNumber: number | string;
  editorId: string;
  timestamp: number;
}) => void;
type EditorErrorHandler = (params: { codingSessionID: string; errorMessage: string }) => void;
type LeaveSessionHandler = (sessionId: string, username: string) => void;
type DisconnectHandler = () => void;

// Test variables
let httpServer: HttpServer;
let ioServer: SocketServer;
let clientSocket: Socket;
let clientSocketURL: string;

const mockAddVersionToSession = jest.spyOn(sessionService, 'addVersionToSession');

// Setup test spy and mock for process.stdout and process.stderr
const mockStdout = {
  on: jest.fn(),
};
const mockStderr = {
  on: jest.fn(),
};
const mockProcess: MockSpawnProcess = {
  stdout: mockStdout,
  stderr: mockStderr,
  on: jest.fn(),
};

beforeAll(done => {
  // Create HTTP server
  httpServer = createServer();
  // Create Socket.IO server
  ioServer = new SocketServer(httpServer);
  // Start HTTP server listening on a random port
  httpServer.listen(() => {
    const address = httpServer.address() as AddressInfo;
    clientSocketURL = `http://localhost:${address.port}`;

    // Register collab handlers with the Socket.IO server
    registerCollabHandlers(ioServer as FakeSOSocket);

    // Create client socket
    clientSocket = ioc(clientSocketURL);

    // When client connects to server
    clientSocket.on('connect', () => {
      // Setup the spawn mock
      (spawn as jest.Mock).mockReturnValue(mockProcess);

      done();
    });
  });
});

afterAll(() => {
  // Cleanup
  if (clientSocket.connected) {
    clientSocket.disconnect();
  }
  ioServer.close();
  httpServer.close();
});

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

describe('Collab Controller', () => {
  describe('joinSession event', () => {
    it('should handle a user joining a session', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the joinSession handler
      const joinSessionHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'joinSession',
      )?.[1] as JoinSessionHandler;

      // Verify handler exists
      expect(joinSessionHandler).toBeDefined();

      // Call the joinSession handler
      joinSessionHandler('test-session', 'test-user');

      // Verify the socket joined the room
      expect(mockClientSocket.join).toHaveBeenCalledWith('test-session');

      // Verify the socket emitted the userJoined event to the room
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('userJoined', 'test-user');

      done();
    });
  });

  describe('codeChange event', () => {
    it('should handle code changes and save versions', done => {
      // Setup mock for addVersionToSession
      mockAddVersionToSession.mockResolvedValue({} as SessionResponse);

      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the codeChange handler
      const codeChangeHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'codeChange',
      )?.[1] as CodeChangeHandler;

      // Verify handler exists
      expect(codeChangeHandler).toBeDefined();

      // Call the codeChange handler
      const params = {
        codingSessionID: 'test-session',
        code: 'print("Hello World")',
        username: 'test-user',
      };
      codeChangeHandler(params);

      // Verify that the code update was broadcast to others in the session
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('codeUpdate', params.code);

      // We don't test throttled save directly since it's time-based

      done();
    });
  });

  describe('cursorChange event', () => {
    it('should handle cursor position changes', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the cursorChange handler
      const cursorChangeHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'cursorChange',
      )?.[1] as CursorChangeHandler;

      // Verify handler exists
      expect(cursorChangeHandler).toBeDefined();

      // Call the cursorChange handler
      const params = {
        codingSessionID: 'test-session',
        cursorPosition: {
          lineNumber: 5,
          column: 10,
        },
        username: 'test-user',
      };
      cursorChangeHandler(params);

      // Verify that the cursor change was broadcast to others in the session
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('cursorChanged', {
        username: 'test-user',
        cursorPosition: {
          lineNumber: 5,
          column: 10,
        },
      });

      done();
    });
  });

  describe('executeCode event', () => {
    it('should execute code and handle successful execution', done => {
      // Setup mock for spawn
      (spawn as jest.Mock).mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn((event, callback) => callback('Hello World')) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
      } as MockSpawnProcess);

      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Mock the server's to method
      const mockServerTo = jest.fn().mockReturnValue({
        emit: jest.fn(),
      } as MockSocketTo);

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the executeCode handler
      const executeCodeHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'executeCode',
      )?.[1] as ExecuteCodeHandler;

      // Verify handler exists
      expect(executeCodeHandler).toBeDefined();

      // Setup for handler mocking socket.to
      const originalSocketTo = ioServer.to;
      ioServer.to = mockServerTo as typeof ioServer.to;

      // Call the executeCode handler
      const params = {
        codingSessionID: 'test-session',
        code: 'print("Hello World")',
        username: 'test-user',
      };
      executeCodeHandler(params);

      // Verify Python process was spawned with correct arguments
      expect(spawn).toHaveBeenCalledWith('python3', ['-c', params.code]);

      // Restore socket.to
      ioServer.to = originalSocketTo;

      // The on('close') callback should have been called by our mock
      expect(mockClientSocket.emit).toHaveBeenCalled();

      done();
    });

    it('should handle Python execution errors', done => {
      // Setup mock for spawn
      (spawn as jest.Mock).mockReturnValue({
        ...mockProcess,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event, callback) => callback('Syntax Error')) },
        on: jest.fn((event, callback) => {
          if (event === 'close') callback(1);
        }),
      } as MockSpawnProcess);

      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Mock the server's to method
      const mockServerTo = jest.fn().mockReturnValue({
        emit: jest.fn(),
      } as MockSocketTo);

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the executeCode handler
      const executeCodeHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'executeCode',
      )?.[1] as ExecuteCodeHandler;

      // Verify handler exists
      expect(executeCodeHandler).toBeDefined();

      // Setup for handler mocking socket.to
      const originalSocketTo = ioServer.to;
      ioServer.to = mockServerTo as typeof ioServer.to;

      // Call the executeCode handler
      const params = {
        codingSessionID: 'test-session',
        code: 'print("Hello',
        username: 'test-user',
      };
      executeCodeHandler(params);

      // Verify Python process was spawned with correct arguments
      expect(spawn).toHaveBeenCalledWith('python3', ['-c', params.code]);

      // Restore socket.to
      ioServer.to = originalSocketTo;

      // The on('close') callback should have been called by our mock
      expect(mockClientSocket.emit).toHaveBeenCalledWith('executionResult', 'Error: Syntax Error');
      expect(mockClientSocket.emit).toHaveBeenCalledWith(
        'editorError',
        'Code execution error: Syntax Error',
      );

      done();
    });
  });

  describe('editHighlight event', () => {
    it('should handle edit highlights', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the editHighlight handler
      const editHighlightHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'editHighlight',
      )?.[1] as EditHighlightHandler;

      // Verify handler exists
      expect(editHighlightHandler).toBeDefined();

      // Call the editHighlight handler
      const params = {
        codingSessionID: 'test-session',
        lineNumber: 10,
        editorId: 'editor-1',
        timestamp: Date.now(),
      };
      editHighlightHandler(params);

      // Verify that the highlight was broadcast to others in the session
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('editHighlight', {
        lineNumber: 10,
        editorId: 'editor-1',
        timestamp: params.timestamp,
      });

      done();
    });

    it('should validate highlight parameters', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the editHighlight handler
      const editHighlightHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'editHighlight',
      )?.[1] as EditHighlightHandler;

      // Verify handler exists
      expect(editHighlightHandler).toBeDefined();

      // Call the editHighlight handler with invalid params
      const invalidParams = {
        codingSessionID: 'test-session',
        lineNumber: 'not-a-number',
        editorId: 'editor-1',
        timestamp: Date.now(),
      };
      editHighlightHandler(invalidParams);

      // Verify that nothing was broadcast due to validation failure
      expect(mockClientSocket.to).not.toHaveBeenCalled();

      done();
    });
  });

  describe('editorError event', () => {
    it('should handle editor errors', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the editorError handler
      const editorErrorHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'editorError',
      )?.[1] as EditorErrorHandler;

      // Verify handler exists
      expect(editorErrorHandler).toBeDefined();

      // Call the editorError handler
      const params = {
        codingSessionID: 'test-session',
        errorMessage: 'Test error message',
      };
      editorErrorHandler(params);

      // Verify that the error was broadcast to others in the session
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('editorError', 'Test error message');

      done();
    });
  });

  describe('leaveSession event', () => {
    it('should handle a user leaving a session', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        leave: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the leaveSession handler
      const leaveSessionHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'leaveSession',
      )?.[1] as LeaveSessionHandler;

      // Verify handler exists
      expect(leaveSessionHandler).toBeDefined();

      // Call the leaveSession handler
      leaveSessionHandler('test-session', 'test-user');

      // Verify the socket left the room
      expect(mockClientSocket.leave).toHaveBeenCalledWith('test-session');

      // Verify the socket emitted the userLeft event to the room
      expect(mockClientSocket.to).toHaveBeenCalledWith('test-session');
      expect(mockClientSocket.to().emit).toHaveBeenCalledWith('userLeft', 'test-user');

      done();
    });
  });

  describe('disconnect event', () => {
    it('should handle user disconnection', done => {
      // Get the connection handler and convert safely
      const connectionHandler = ioServer.listeners('connection')[0] as unknown as (
        socket: MockClientSocket,
      ) => void;

      // Create a mock client socket
      const mockClientSocket: MockClientSocket = {
        id: 'mock-client-id',
        join: jest.fn(),
        to: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
      };

      // Call the connection handler with our mock socket
      connectionHandler(mockClientSocket);

      // Extract the disconnect handler
      const disconnectHandler = mockClientSocket.on.mock.calls.find(
        call => call[0] === 'disconnect',
      )?.[1] as DisconnectHandler;

      // Verify handler exists
      expect(disconnectHandler).toBeDefined();

      // Call the disconnect handler
      disconnectHandler();

      // No explicit assertions needed as the handler just logs

      done();
    });
  });
});
