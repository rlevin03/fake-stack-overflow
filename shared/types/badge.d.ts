import { ObjectId } from 'mongodb';
import { Request } from 'express';

export type BadgeNameType =
  | 'Curious Cat'
  | 'Helping Hand'
  | 'Lifeline'
  | 'Lightning Responder'
  | 'Respected Voice'
  | 'Peoples Champion'
  | 'Pair Programmer'
  | 'The Historian';

export type BadgeDescriptionType =
  | 'Asked 10+ questions that received at least one upvote.'
  | 'Provided 5+ answers'
  | 'Answered a question that was unanswered for more than 24 hours.'
  | 'Answered a question within 5 minutes of it being posted.'
  | 'Accumulated 500+ reputation points from upvotes on answers.'
  | 'Received 50+ upvotes on a single answer.'
  | 'Participated in a live collaborative coding session.'
  | 'Reverted code to a previous version using the edit history feature.';

/**
 * Represents a badge that can be earned by users.
 * - `progress`: The progress towards earning the badge.
 * - `attained`: A boolean indicating if the badge has been attained.
 * - `name`: The name of the badge.
 * - `description`: A brief description of the badge.
 */
export interface Badge {
  progress: number;
  attained: boolean;
  name: BadgeNameType;
  description: BadgeDescriptionType;
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

export interface BadgeRequest extends Request {
  body: {
    badgeIds: string[];
  };
}

// Add this to shared/types/types.d.ts

/**
 * Payload for badge notifications sent from the server
 */
export interface BadgeNotificationPayload {
  /**
   * Username of the user receiving the badge/progress
   */
  username: string;
  /**
   * Type of notification - full badge award or progress update
   */
  type: 'awarded' | 'progress';
  /**
   * Name of the badge
   */
  badgeName: string;
  /**
   * Notification message to display
   */
  message: string;
}
