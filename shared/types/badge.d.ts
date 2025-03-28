import { ObjectId } from 'mongodb';
import { Request, Response, NextFunction, Router } from 'express';

export type BadgeName =
  | 'Curious Cat'
  | 'Helping Hand'
  | 'Lifeline'
  | 'Lightning Responder'
  | 'Respected Voice'
  | 'Peoples Champion'
  | 'Hidden Gem'
  | 'Pair Programmer'
  | 'The Historian';

export type BadgeDescription =
  | 'Asked 10+ questions that received at least one upvote.'
  | 'Provided 5+ answers'
  | 'Answered a question that was unanswered for more than 24 hours.'
  | 'Answered a question within 5 minutes of it being posted.'
  | 'Accumulated 500+ reputation points from upvotes on answers.'
  | 'Received 50+ upvotes on a single answer.'
  | 'Had a response that was initially overlooked but later received 10+ upvotes.'
  | 'Participated in a live collaborative coding session.'
  | 'Reverted code to a previous version using the edit history feature.';
/**
 * Represents a badge that can be earned by users.
 * - `level`: The level of the badge.
 * - `progress`: The progress towards earning the badge.
 * - `attained`: A boolean indicating if the badge has been attained.
 * - `name`: The name of the badge.
 * - `description`: A brief description of the badge.
 * - `icon`: The icon of the badge.
 */

export interface Badge {
  level: number;
  progress: number;
  attained: boolean;
  name: BadgeName;
  description: BadgeDescription;
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

export interface GrantBadgeRequest extends Request {
  params: {
    userId: string;
  };
  body: {
    badgeName: BadgeName;
    progressGained: number;
  };
}
