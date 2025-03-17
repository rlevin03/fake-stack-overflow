import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Session collection.
 *
 * This schema defines the structure for storing sessions in the database.
 * Each session includes the following fields:
 * - `sessionID`: The unique identifier for the session.
 * - `versions`: The versions of the session.
 */
const sessionSchema: Schema = new Schema(
  {
    sessionID: {
      type: String,
      required: true,
    },
    versions: {
      type: [String],
      default: [],
    },
  },
  { collection: 'Session' },
);

export default sessionSchema;
