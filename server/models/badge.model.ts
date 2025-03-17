import mongoose, { Model } from 'mongoose';
import badgeSchema from './schema/badge.schema';
import { DatabaseBadge } from '../types/types';

/**
 * Mongoose model for the `Badge` collection.
 *
 * This model is created using the `badge` interface and the `badgeSchema`, representing the
 * `Badge` collection in the MongoDB database, and provides an interface for interacting with
 * the stored basges.
 *
 * @type {Model<DatabaseBadge>}
 */
const BadgeModel: Model<DatabaseBadge> = mongoose.model<DatabaseBadge>('Badge', badgeSchema);

export default BadgeModel;
