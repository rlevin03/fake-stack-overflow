import mongoose, { Model } from 'mongoose';
import badgeSchema from './schema/badge.schema';
import { DatabaseBadge } from '../types/types';

/**
 * Mongoose model for the `Tag` collection.
 *
 * This model is created using the `Tag` interface and the `tagSchema`, representing the
 * `Tag` collection in the MongoDB database, and provides an interface for interacting with
 * the stored tags.
 *
 * @type {Model<DatabaseBadge>}
 */
const BadgeModel: Model<DatabaseBadge> = mongoose.model<DatabaseBadge>('Badge', badgeSchema);

export default BadgeModel;
