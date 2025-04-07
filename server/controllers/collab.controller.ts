/* eslint-disable no-console */
import { spawn } from 'child_process';
import { FakeSOSocket } from '../types/types';
import { addVersionToSession } from '../services/session.service';

// Type-safe throttle function that preserves parameter types
const throttle = <Args extends unknown[], R>(
  func: (...args: Args) => R,
  delay: number,
): ((...args: Args) => R | undefined) => {
  let lastCall = 0;

  return (...args: Args): R | undefined => {
    const now = new Date().getTime();

    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }

    return undefined;
  };
};

// Create the save version function with proper types
const saveVersion = async (sessionId: string, code: string): Promise<void> => {
  try {
    await addVersionToSession(sessionId, code);
    console.log(`Version saved for session ${sessionId}`);
  } catch (error) {
    console.error(`Error saving version for session ${sessionId}:`, error);
  }
};

// Create a throttled version of the saveVersion function
const throttledSaveVersion = throttle(saveVersion, 5000); // Save at most once every 5 seconds

const registerCollabHandlers = (socket: FakeSOSocket): void => {
  socket.on('connection', clientSocket => {
    console.log('A user connected ->', clientSocket.id);

    clientSocket.on('joinSession', (sessionId: string, username: string) => {
      clientSocket.join(sessionId);
      clientSocket.to(sessionId).emit('userJoined', username);
      console.log(`${username} joined session ${sessionId}`);
    });

    // Use explicit type annotation for destructured parameters
    clientSocket.on(
      'codeChange',
      (params: { codingSessionID: string; code: string; username: string }) => {
        const { codingSessionID, code, username } = params;
        clientSocket.to(codingSessionID).emit('codeUpdate', code);
        console.log(`${username} changed code in session ${codingSessionID}`);

        // Throttled save of code version
        throttledSaveVersion(codingSessionID, code);
      },
    );

    // Fixed syntax for the cursorChange handler
    clientSocket.on(
      'cursorChange',
      (params: {
        codingSessionID: string;
        cursorPosition: {
          lineNumber: number;
          column: number;
        };
        username: string;
      }) => {
        const { codingSessionID, cursorPosition, username } = params;
        clientSocket.to(codingSessionID).emit('cursorChanged', {
          username,
          cursorPosition,
        });
        console.log(`${username} moved cursor in session ${codingSessionID}`);
      },
    );

    // Use explicit type annotation for destructured parameters
    clientSocket.on(
      'executeCode',
      (params: { codingSessionID: string; code: string; username: string }) => {
        const { codingSessionID, code, username } = params;
        console.log(`${username} is executing Python code in session ${codingSessionID}`);

        // Save the version before execution
        throttledSaveVersion(codingSessionID, code);

        // Spawn a Python process to execute the provided code.
        const pythonProcess = spawn('python3', ['-c', code]);
        let stdout = '';
        let stderr = '';

        // Capture standard output - using chunk instead of data to avoid shadowing
        pythonProcess.stdout.on('data', chunk => {
          stdout += chunk.toString();
        });

        // Capture error output - using chunk instead of data to avoid shadowing
        pythonProcess.stderr.on('data', chunk => {
          stderr += chunk.toString();
        });

        // When the Python process closes, send back the result.
        pythonProcess.on('close', exitCode => {
          if (stderr) {
            clientSocket.emit('executionResult', `Error: ${stderr}`);
            console.log(`Error executing Python code: ${stderr}`);

            // ADDED: Also broadcast the error to all users in the session
            const errorMessage = `Code execution error: ${stderr.split('\n')[0]}`;
            socket.to(codingSessionID).emit('editorError', errorMessage);
            clientSocket.emit('editorError', errorMessage);
          } else {
            // Emit to everyone in the room
            socket.to(codingSessionID).emit('executionResult', stdout);
            clientSocket.emit('executionResult', stdout);
            console.log(`Python execution successful. Output: ${stdout}`);
          }
        });

        // ADDED: Handle process errors
        pythonProcess.on('error', error => {
          const errorMessage = `Process error: ${error.message}`;
          console.error(errorMessage);
          socket.to(codingSessionID).emit('editorError', errorMessage);
          clientSocket.emit('editorError', errorMessage);
        });
      },
    );

    // Add this new event handler
    // Server-side handler for editHighlight
    clientSocket.on(
      'editHighlight',
      (params: {
        codingSessionID: string;
        lineNumber: number;
        editorId: string;
        timestamp: number;
      }) => {
        try {
          const { codingSessionID, lineNumber, editorId, timestamp } = params;

          // Validate data before broadcasting
          if (typeof lineNumber !== 'number' || !editorId || !timestamp) {
            console.warn('Received invalid highlight params:', params);
            return;
          }

          // Broadcast the highlight to all clients in the room except the sender
          // Only send the properties the client expects to receive
          clientSocket
            .to(codingSessionID)
            .emit('editHighlight', { lineNumber, editorId, timestamp });

          console.log(`Edit highlight at line ${lineNumber} in session ${codingSessionID}`);
        } catch (err) {
          console.error('Error processing edit highlight in server:', err);
        }
      },
    );

    // ADDED: Editor error handler
    clientSocket.on('editorError', (params: { codingSessionID: string; errorMessage: string }) => {
      try {
        const { codingSessionID, errorMessage } = params;

        console.error(`Editor error in session ${codingSessionID}: ${errorMessage}`);

        // Broadcast to all other clients in the room
        clientSocket.to(codingSessionID).emit('editorError', errorMessage);
      } catch (err) {
        console.error('Error broadcasting editor error:', err);
      }
    });

    clientSocket.on('leaveSession', (sessionId: string, username: string) => {
      clientSocket.leave(sessionId);
      clientSocket.to(sessionId).emit('userLeft', username);
      console.log(`${username} left session ${sessionId}`);
    });

    clientSocket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};

export default registerCollabHandlers;
