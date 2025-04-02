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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'Session', timestamps: true },
);

export default sessionSchema;
