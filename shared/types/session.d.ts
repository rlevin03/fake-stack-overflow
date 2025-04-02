import { ObjectId } from 'mongodb';
import { Request } from 'express';

/**
 * A session represents a collaborative coding environment.
 * - `versions`: Stores the list of code snapshots over time.
 * - `createdBy` (optional): The user who created the session.
 * - `createdAt`, `updatedAt`: Timestamps automatically managed by MongoDB.
 */
export interface Session {
  versions: string[];
  createdBy?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a session document stored in the database.
 * - `_id`: Unique identifier for the session.
 */
export interface DatabaseSession extends Session {
  _id: ObjectId;
}

/**
 * Represents a request to create a session.
 * - If you have middleware attaching `user` to the request, you may use that context here.
 */
export interface CreateSessionRequest extends Request {
  query: {
    userId: string;
  };
}

/**
 * Represents a request to update a session by adding a new version.
 * - `version`: The code snapshot to be added to the session.
 */
export interface UpdateSessionRequest extends Request {
  params: {
    sessionId: string;
  };
  body: {
    version: string;
  };
}

/**
 * Represents a request to fetch a session by its ID.
 */
export interface SessionByIdRequest extends Request {
  params: {
    sessionId: string;
  };
}

export interface UserSessionsRequest extends Request {
  query: {
    userId: string;
  };
}

/**
 * Type representing the response from any session-related operation.
 * - Either a `DatabaseSession` object or an error object.
 */
export type SessionResponse = DatabaseSession | { error: string };

/**
 * Type representing a list of session responses.
 * - Either an array of `DatabaseSession` objects or an error object.
 */
export type SessionsResponse = DatabaseSession[] | { error: string };
