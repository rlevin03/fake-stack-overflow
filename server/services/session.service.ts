import { Types } from 'mongoose';
import SessionModel from '../models/sessions.model';
import UserModel from '../models/users.model';
import { DatabaseSession, SessionResponse, SessionsResponse } from '../types/types';

/**
 * Creates a new collaborative coding session.
 * Looks up the user by username and associates the session with that user's ID.
 *
 * @param username - The username of the user creating the session.
 * @returns The newly created session object or an error object.
 */
export const createSession = async (username: string): Promise<SessionResponse> => {
  try {
    const sessionData: Partial<DatabaseSession> = {
      versions: [],
    };

    if (username) {
      const userRecord = await UserModel.findOne({ username }).lean();
      if (!userRecord) {
        throw new Error('User not found');
      }
      sessionData.createdBy = userRecord._id;
    }

    const newSession = await SessionModel.create(sessionData);
    if (!newSession) {
      throw new Error('Failed to create session');
    }
    return newSession.toObject();
  } catch (error: unknown) {
    return {
      error: `Error occurred when creating session: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};

/**
 * Retrieves a session by its MongoDB ID.
 *
 * @param sessionId - The ID of the session to retrieve.
 * @returns The session object or an error object.
 */
export const getSessionById = async (sessionId: string): Promise<SessionResponse> => {
  try {
    const session = await SessionModel.findById(sessionId).lean();
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  } catch (error: unknown) {
    return {
      error: `Error retrieving session: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Retrieves all sessions associated with a given username.
 *
 * @param username - The username of the user.
 * @returns An array of session objects or an error object.
 */
export const getUserSessions = async (username: string): Promise<SessionsResponse> => {
  try {
    // Look up the user by username to get their _id
    const userRecord = await UserModel.findOne({ username }).lean();
    if (!userRecord) {
      throw new Error('User not found');
    }
    const sessions = await SessionModel.find({ createdBy: userRecord._id }).lean();
    return sessions;
  } catch (error: unknown) {
    return {
      error: `Error retrieving user sessions: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};

/**
 * Adds a new version (code snapshot) to an existing session.
 *
 * @param sessionId - The ID of the session to update.
 * @param version - The new version (code snapshot) to add.
 * @returns The updated session object or an error object.
 */
export const addVersionToSession = async (
  sessionId: string,
  version: string,
): Promise<SessionResponse> => {
  try {
    const session = await SessionModel.findById(sessionId);
    if (!session) return { error: 'Session not found' };

    session.versions.push(version);
    session.updatedAt = new Date();
    await session.save();
    return session.toObject();
  } catch (error: unknown) {
    return {
      error: `Error updating session: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
