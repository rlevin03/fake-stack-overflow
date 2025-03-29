import { ObjectId } from 'mongodb';
import { Request, Response, NextFunction, Router } from 'express';

export enum BadgeName {
  CURIOUS_CAT = 'Curious Cat',
  HELPING_HAND = 'Helping Hand',
  LIFELINE = 'Lifeline',
  LIGHTNING_RESPONDER = 'Lightning Responder',
  RESPECTED_VOICE = 'Respected Voice',
  PEOPLES_CHAMPION = 'Peoples Champion',
  PAIR_PROGRAMMER = 'Pair Programmer',
  THE_HISTORIAN = 'The Historian',
}

export enum BadgeDescription {
  CURIOUS_CAT = 'Asked 10+ questions that received at least one upvote.',
  HELPING_HAND = 'Provided 5+ answers',
  LIFELINE = 'Answered a question that was unanswered for more than 24 hours.',
  LIGHTNING_RESPONDER = 'Answered a question within 5 minutes of it being posted.',
  RESPECTED_VOICE = 'Accumulated 500+ reputation points from upvotes on answers.',
  PEOPLES_CHAMPION = 'Received 50+ upvotes on a single answer.',
  PAIR_PROGRAMMER = 'Participated in a live collaborative coding session.',
  THE_HISTORIAN = 'Reverted code to a previous version using the edit history feature.',
}

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
  name: BadgeName;
  description: BadgeDescription;
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

export interface CreateBadgeRequest extends Request {
  params: {
    userId: string;
  };
  body: {
    name: BadgeName;
    description: BadgeDescription;
  };
}
