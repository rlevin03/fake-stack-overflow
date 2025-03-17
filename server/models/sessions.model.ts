import mongoose, { Model } from 'mongoose';
import sessionSchema from './schema/session.schema';
import { DatabaseSession } from '../types/types';

/**
 * Mongoose model for the `Session` collection.
 *
 * This model is created using the `session` interface and the `sessionSchema`, representing the
 * `Session` collection in the MongoDB database, and provides an interface for interacting with
 * the stored sessions.
 *
 * @type {Model<DatabaseSession>}
 */

const SessionModel: Model<DatabaseSession> = mongoose.model<DatabaseSession>(
  'Session',
  sessionSchema,
);

export default SessionModel;
