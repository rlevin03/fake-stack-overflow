import { ObjectId } from 'mongodb';

/**
 * Represents a badge that can be earned by users.
 * - `level`: The level of the badge.
 * - `name`: The name of the badge.
 * - `description`: A description of the badge.
 * - `icon`: The icon representing the badge.
 */

export interface Badge {
  level: number;
  name: string;
  description: string;
  icon: string;
}

/**
 * Represents a badge stored in the database.
 * - `_id`: Unique identifier for the badge.
 * - `level`: The level of the badge.
 * - `name`: The name of the badge.
 * - `description`: A description of the badge.
 * - `icon`: The icon representing the badge.
 */
export interface DatabaseBadge extends Badge {
  _id: ObjectId;
}
