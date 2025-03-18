import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Session collection.
 *
 * This schema defines the structure for storing sessions in the database.
 * Each session includes the following fields:
 * - `versions`: The versions of the session.
 * records the timestamp of the creation and the last update.
 */
const sessionSchema: Schema = new Schema(
  {
    versions: {
      type: [String],
      default: [],
    },
  },
  { collection: 'Session', timestamps: true },
);

export default sessionSchema;
