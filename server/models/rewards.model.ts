import mongoose, { Model } from 'mongoose';
import rewardSchema from './schema/rewards.schema';
import { DatabaseReward } from '@fake-stack-overflow/shared';

/**
 * Mongoose model for the `Rewards` collection.
 * * This model is created using the `Reward` interface and the `questionSchema`, representing the
 * `Question` collection in the MongoDB database, and provides an interface for interacting with
 * the stored questions.
 *
 * @type {Model<DatabaseReward>}
 */
const RewardModel: Model<DatabaseReward> = mongoose.model<DatabaseReward>('Reward', rewardSchema);

export default RewardModel;
