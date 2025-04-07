import React, { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import io from 'socket.io-client';
import * as monaco from 'monaco-editor';
import UserContext from '../../../contexts/UserContext';
import { getSessionByIdAPI } from '../../../services/sessionService';
import './index.css';

// Ensure 'monaco-editor' is in your dependencies: run 'npm i -S monaco-editor'
const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:8000');

// Define a fixed palette of colors.
const USER_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#A633FF', '#33FFF2'];
const getUserColor = (collabName: string): string => {
  let hash = 0;
  for (let i = 0; i < collabName.length; i++) {
    hash = collabName.charCodeAt(i) + hash * 31;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

interface CollaboratorInfo {
  cursorPosition: { lineNumber: number; column: number };
  color: string;
}

interface EditHighlight {
  lineNumber: number;
  editorId: string;
  timestamp: number;
}

// Error handling utility
const handleError = (
  error: Error | unknown,
  notificationFn?: (message: string) => void,
  errorMessage = 'An error occurred',
): void => {
  if (notificationFn) {
    notificationFn(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const CollaborativeEditor: React.FC = () => {
  const { codingSessionID } = useParams();
  const { user } = useContext(UserContext);
  const { username } = user; // Using the username from context

  // Editor state.
  const [code, setCode] = useState('# Start coding here...');
  const [output, setOutput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  // Add state for theme
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);

  // A unique ID for this editor instance
  const editorIdRef = useRef<string>(`editor-${Math.random().toString(36).substring(2, 9)}`);

  // Store collaborators with their cursor position and assigned color.
  const [collaborators, setCollaborators] = useState<{ [collabName: string]: CollaboratorInfo }>(
    {},
  );

  // Store active edit highlights
  const [editHighlights, setEditHighlights] = useState<EditHighlight[]>([]);

  // Save the editor instance for updating decorations.
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );

  // Use a ref to track decoration IDs (avoiding state re-renders).
  const decorationIdsRef = useRef<string[]>([]);

  // Use a ref to track highlight decoration IDs
  const highlightDecorationsRef = useRef<string[]>([]);

  // Helper to show transient notifications.
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to show error notifications
  const showErrorNotification = (message: string) => {
    setErrorNotification(message);
    setTimeout(() => setErrorNotification(null), 5000); // Error notifications stay longer
  };

  // Handler for theme toggle - no notification
  const handleThemeToggle = () => {
    setIsDarkTheme(prev => !prev);
  };

  // Fetch session data when component mounts
  useEffect(() => {
    const fetchSession = async () => {
      if (!codingSessionID) return;

      try {
        setIsLoading(true);
        const sessionData = await getSessionByIdAPI(codingSessionID);

        // Check if there are any versions and use the latest one
        if (sessionData.versions && sessionData.versions.length > 0) {
          setCode(sessionData.versions[sessionData.versions.length - 1]);
        }
      } catch (error) {
        handleError(error, showErrorNotification, 'Error fetching session');
        showNotification('Failed to load previous code version');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [codingSessionID]);

  // Apply decorations for all edit highlights with error handling
  const applyHighlightDecorations = () => {
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    try {
      const now = Date.now();
      // Filter valid highlights - both by time and by line number validity
      const validHighlights = editHighlights.filter(highlight => {
        // Check if highlight is still within time window
        const isRecent = now - highlight.timestamp < 3000;

        // Check if line number is valid for current model
        const isValidLine =
          typeof highlight.lineNumber === 'number' &&
          highlight.lineNumber > 0 &&
          highlight.lineNumber <= model.getLineCount();

        return isRecent && isValidLine;
      });

      // Create decorations only for valid highlights
      const decorations: monaco.editor.IModelDeltaDecoration[] = validHighlights.map(highlight => {
        try {
          const maxColumn = model.getLineMaxColumn(highlight.lineNumber);
          return {
            range: new monaco.Range(
              highlight.lineNumber,
              1,
              highlight.lineNumber,
              maxColumn || 1, // Fallback to 1 if maxColumn is somehow 0
            ),
            options: {
              inlineClassName: 'recent-edit',
            },
          };
        } catch (err) {
          // Broadcast error to all users
          if (codingSessionID) {
            socket.emit('editorError', {
              codingSessionID,
              errorMessage: `Error with line ${highlight.lineNumber}: Invalid line number`,
            });
          }

          // Return a "safe" decoration that won't cause errors
          return {
            range: new monaco.Range(1, 1, 1, 1),
            options: {
              inlineClassName: 'recent-edit',
            },
          };
        }
      });

      // Apply decorations safely
      highlightDecorationsRef.current = editorInstance.deltaDecorations(
        highlightDecorationsRef.current,
        decorations,
      );
    } catch (err) {
      // Broadcast error to all users
      if (codingSessionID) {
        socket.emit('editorError', {
          codingSessionID,
          errorMessage: 'Error applying highlight decorations',
        });
      }

      // Reset decorations to clean state if we encounter an error
      highlightDecorationsRef.current = editorInstance.deltaDecorations(
        highlightDecorationsRef.current,
        [],
      );
    }
  };

  // Clean up expired highlights
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setEditHighlights(prev => prev.filter(highlight => now - highlight.timestamp < 3000));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Update decorations whenever editHighlights changes
  useEffect(() => {
    applyHighlightDecorations();
  }, [editHighlights]);

  // Socket event handling.
  useEffect(() => {
    if (!codingSessionID) return;
    socket.emit('joinSession', codingSessionID, username);

    socket.on('codeUpdate', (newCode: string) => {
      setCode(newCode);
    });

    socket.on('executionResult', (result: string) => {
      setOutput(result);
    });

    socket.on('userJoined', (joinedUser: string) => {
      if (joinedUser !== username) {
        showNotification(`${joinedUser} joined the session`);
      }
    });

    socket.on('userLeft', (leftUser: string) => {
      if (leftUser !== username) {
        showNotification(`${leftUser} left the session`);
      }
      setCollaborators(prev => {
        const updated = { ...prev };
        delete updated[leftUser];
        return updated;
      });
    });

    socket.on('cursorChanged', ({ username: changedUser, cursorPosition }) => {
      if (changedUser !== username) {
        setCollaborators(prev => ({
          ...prev,
          [changedUser]: {
            cursorPosition,
            color: prev[changedUser]?.color || getUserColor(changedUser),
          },
        }));
      }
    });

    // Listen for edit highlights from other users
    socket.on('editHighlight', data => {
      try {
        const { lineNumber, editorId, timestamp } = data;

        // Validate data before using
        if (typeof lineNumber !== 'number' || !editorId || !timestamp) {
          return;
        }

        // Only add highlights from other editor instances
        if (editorId !== editorIdRef.current) {
          setEditHighlights(prev => [...prev, { lineNumber, editorId, timestamp }]);
        }
      } catch (err) {
        handleError(err, showErrorNotification, 'Error processing edit highlight');
      }
    });

    // Add listener for editor errors
    socket.on('editorError', (errorMessage: string) => {
      showErrorNotification(errorMessage);
    });

    // eslint-disable-next-line consistent-return
    return () => {
      socket.emit('leaveSession', codingSessionID, username);
      socket.off('codeUpdate');
      socket.off('executionResult');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('cursorChanged');
      socket.off('editHighlight');
      socket.off('editorError');
    };
  }, [codingSessionID, username]);

  // Handle code changes.
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && codingSessionID) {
      if (editorInstance) {
        const position = editorInstance.getPosition();
        if (position) {
          const { lineNumber } = position;
          const timestamp = Date.now();

          // Add to local state
          setEditHighlights(prev => [
            ...prev,
            { lineNumber, editorId: editorIdRef.current, timestamp },
          ]);

          // Broadcast to other users
          socket.emit('editHighlight', {
            codingSessionID,
            lineNumber,
            editorId: editorIdRef.current,
            timestamp,
          });
        }
      }

      setCode(value);
      socket.emit('codeChange', { codingSessionID, code: value, username });
      // No need for separate REST API call since socket.io is handling saving
    }
  };

  const runCode = () => {
    if (codingSessionID) {
      socket.emit('executeCode', { codingSessionID, code, username });
    }
  };

  const formatCode = async () => {
    try {
      // Simple formatting: standardize spacing and remove excessive blank lines
      if (code.trim()) {
        // Split into lines
        const lines = code.split('\n');

        // Remove excessive blank lines (more than 2 consecutive blank lines)
        const formattedLines = [];
        let blankLineCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trimRight(); // Remove trailing whitespace

          if (line.trim() === '') {
            blankLineCount++;
            // Only keep up to 2 consecutive blank lines
            if (blankLineCount <= 2) {
              formattedLines.push('');
            }
          } else {
            blankLineCount = 0;

            // Standardize spacing around operators
            const formattedLine = line
              // Add space after commas if not already there
              .replace(/,(?!\s)/g, ', ')
              // Add spaces around operators
              .replace(/([+\-*/%=<>!&|^])([\w\d(])/g, '$1 $2')
              .replace(/([\w\d)])([-+*/%=<>!&|^])/g, '$1 $2')
              // Preserve indentation
              .replace(/^\s*/, match => match);

            formattedLines.push(formattedLine);
          }
        }

        const formattedCode = formattedLines.join('\n');
        setCode(formattedCode);

        if (codingSessionID) {
          socket.emit('codeChange', { codingSessionID, code: formattedCode, username });
        }
      }
    } catch (error) {
      handleError(error, showErrorNotification, 'Formatting failed');

      // Broadcast error to all users
      if (codingSessionID) {
        socket.emit('editorError', {
          codingSessionID,
          errorMessage: 'Code formatting failed. Check your syntax.',
        });
      }
    }
  };

  // Capture the editor instance and send local cursor movements.
  const handleEditorMount: OnMount = editor => {
    setEditorInstance(editor);

    editor.onDidChangeCursorPosition(event => {
      if (codingSessionID) {
        const cursorPosition = event.position;
        socket.emit('cursorChange', { codingSessionID, cursorPosition, username });
      }
    });
  };

  // Update Monaco Editor decorations based on remote collaborators' cursor positions.
  useEffect(() => {
    if (editorInstance) {
      requestAnimationFrame(() => {
        const newDecorations = Object.entries(collaborators).map(([collabName, info]) => {
          const { cursorPosition } = info;
          return {
            range: new monaco.Range(
              cursorPosition.lineNumber,
              cursorPosition.column,
              cursorPosition.lineNumber,
              cursorPosition.column,
            ),
            options: {
              afterContentClassName: `collab-cursor-${collabName}`,
              stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            },
          };
        });
        decorationIdsRef.current = editorInstance.deltaDecorations(
          decorationIdsRef.current,
          newDecorations,
        );
      });
    }
  }, [collaborators, editorInstance]);

  // Dynamically inject CSS for each collaborator's cursor decoration.
  useEffect(() => {
    Object.entries(collaborators).forEach(([collabName, info]) => {
      const styleId = `cursor-style-${collabName}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .monaco-editor .collab-cursor-${collabName}::after {
            content: '';
            display: inline-block;
            width: 2px;
            background-color: ${info.color} !important;
            height: 1em;
            vertical-align: middle;
            margin-left: 2px;
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [collaborators]);

  if (!codingSessionID) {
    return <div>No session ID found in the URL.</div>;
  }

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  return (
    <div className={`collaborative-editor ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {notification && <div className='notification-toast'>{notification}</div>}
      {errorNotification && (
        <div className='error-notification-toast'>
          <span role='img' aria-label='Error'>
            ⚠️
          </span>{' '}
          {errorNotification}
        </div>
      )}

      <MonacoEditor
        height='60vh'
        language='python'
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        options={{
          automaticLayout: true,
          theme: isDarkTheme ? 'vs-dark' : 'vs-light',
        }}
      />

      <div className='controls'>
        <button onClick={runCode}>Run</button>
        <button onClick={formatCode}>Format</button>

        {/* Theme toggle switch */}
        <div className='theme-toggle'>
          <label htmlFor='theme-switch'>Theme:</label>
          <label className='toggle-switch'>
            <input
              type='checkbox'
              id='theme-switch'
              checked={isDarkTheme}
              onChange={handleThemeToggle}
            />
            <span className='slider'>
              <span className='sun-icon' role='img' aria-label='Light mode'>
                ☀️
              </span>
              <span className='moon-icon' role='img' aria-label='Dark mode'>
                🌙
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className='output-panel'>
        <h3>Shared Output</h3>
        <pre>{output}</pre>
      </div>

      <div className='collaborators'>
        <h3>Collaborators Cursors</h3>
        <ul>
          {Object.entries(collaborators).map(([collabName, info]) => (
            <li key={collabName}>
              {collabName}: Line {info.cursorPosition.lineNumber}, Column{' '}
              {info.cursorPosition.column}
              <span
                style={{
                  backgroundColor: info.color,
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  marginLeft: '8px',
                  borderRadius: '50%',
                }}></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
