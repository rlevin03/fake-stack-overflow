import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Reward collection.
 *
 * This schema keeps track of the points a user has and the rewards they have redeemed.
 * Each Reward includes the following fields:
 * - `userId`: The ID of the user who posesses the rewards and points.
 * - `points`: The number of points the user has.
 * - `redeemedRewards`: The rewards the user has redeemed.
 * - `futureRewards`: The rewards the user has not yet redeemed and their corresponding points.
 */
const rewardSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    redeemedRewards: [{ type: Schema.Types.ObjectId, ref: 'Prize' }],
    futureRewards: [{ type: Schema.Types.ObjectId, ref: 'Prize' }],
  },
  { collection: 'Reward' },
);

export default rewardSchema;
