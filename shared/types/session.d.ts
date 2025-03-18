import { ObjectId } from 'mongodb';

/**
 * A session is a collection of versions of a document that can be used to track changes over time.
 * - `versions`: The past versions of the session.
 */
export interface Session {
  versions: string[];
}

/**
 * Represents a session stored in the database.
 * - `_id`: Unique identifier for the session.
 */
export interface DatabaseSession extends Session {
  _id: ObjectId;
}
