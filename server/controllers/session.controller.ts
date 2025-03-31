import express, { Request, Response, Router } from 'express';
import {
  createSession,
  getSessionById,
  getUserSessions,
  addVersionToSession,
} from '../services/session.service';
import {
  CreateSessionRequest,
  SessionByIdRequest,
  UpdateSessionRequest,
  FakeSOSocket,
} from '../types/types';

const sessionController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  /**
   * POST /api/sessions
   * Creates a new collaborative coding session.
   * Expects the username in the request body.
   */
  const createNewSession = async (req: CreateSessionRequest, res: Response): Promise<void> => {
    try {
      const { username } = req.body;
      if (!username) {
        res.status(400).send('Missing username');
        return;
      }
      const session = await createSession(username);
      if ('error' in session) {
        throw new Error(session.error);
      }
      socket.emit('sessionUpdate', {
        session,
        type: 'created',
      });
      res.status(200).json(session);
    } catch (error) {
      res.status(500).send(`Error creating session: ${error}`);
    }
  };

  /**
   * GET /api/sessions/:sessionId
   * Retrieves a session by its ID.
   */
  const getSession = async (req: SessionByIdRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await getSessionById(sessionId);
      if (!session || 'error' in session) {
        res.status(404).send('Session not found');
        return;
      }
      res.status(200).json(session);
    } catch (error) {
      res.status(500).send(`Error retrieving session: ${error}`);
    }
  };

  /**
   * GET /api/sessions/:username/sessions
   * Retrieves all sessions for the given username.
   */
  const getSessionsForUser = async (
    req: Request<{ username: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const { username } = req.params;
      if (!username) {
        res.status(400).send('Missing username');
        return;
      }
      const sessions = await getUserSessions(username);
      if ('error' in sessions) {
        throw new Error(sessions.error);
      }
      res.status(200).json(sessions);
    } catch (error) {
      res.status(500).send(`Error retrieving user sessions: ${error}`);
    }
  };

  /**
   * PATCH /api/sessions/:sessionId
   * Adds a new version (e.g., a code snapshot) to an existing session.
   */
  const updateSession = async (req: UpdateSessionRequest, res: Response): Promise<void> => {
    try {
      if (!req.body.version || req.body.version.trim() === '') {
        res.status(400).send('Invalid version in request body');
        return;
      }
      const { sessionId } = req.params;
      const { version } = req.body;
      const updatedSession = await addVersionToSession(sessionId, version);
      if (!updatedSession || 'error' in updatedSession) {
        res.status(404).send('Session not found');
        return;
      }
      socket.emit('sessionUpdate', {
        session: updatedSession,
        type: 'updated',
      });
      res.status(200).json(updatedSession);
    } catch (error) {
      res.status(500).send(`Error updating session: ${error}`);
    }
  };

  // ---------------- REGISTER ALL ROUTES ----------------
  router.post('/', createNewSession);
  router.get('/:sessionId', getSession);
  router.get('/:username/sessions', getSessionsForUser);
  router.patch('/:sessionId', updateSession);

  return router;
};

export default sessionController;
