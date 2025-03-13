import { ObjectId } from 'mongodb';

/**
 * Represents a Reward.
 * - `userId`: The ID of the user who posesses the rewards and points.
 * - `points`: The number of points the user has.
 * - `redeemedPrizes`: The prize the user has redeemed.
 * - `futurePrizes`: The prizes the user has not yet redeemed and their corresponding points.
 */
export interface Reward {
  userId: ObjectId;
  points: number;
  redeemedPrizes: ObjectId[];
  futurePrizes: ObjectId[];
}

/**
 * Represents a reward stored in the database.
 * - `_id`: Unique identifier for the reward.
 * - `userId`: The ID of the user who posesses the rewards and points.
 * - `points`: The number of points the user has.
 * - `redeemedPrizes`: The prize the user has redeemed.
 * - `futurePrizes`: The prizes the user has not yet redeemed and their corresponding points.
 */
export interface DatabaseReward extends Reward {
  _id: ObjectId;
}
