/**
 * A session is a collection of versions of a document that can be used to track changes over time.
 * - `sessionID`: The unique identifier for the session.
 * - `versions`: The past versions of the session.
 */
export interface DatabaseSession {
  sessionID: string;
  versions: string[];
}
