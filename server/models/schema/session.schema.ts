import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Session collection.
 *
 * This schema defines the structure for storing sessions in the database.
 * Each session includes the following fields:
 * - `_id`: The unique identifier for the session.
 * - `versions`: The versions of the session.
 */
const sessionSchema: Schema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
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
