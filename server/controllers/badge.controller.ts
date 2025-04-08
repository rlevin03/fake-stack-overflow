import express, { Request, Response } from 'express';
import { BadgeRequest } from '../types/types';
import { getBadgesByIds } from '../services/badge.service';

const badgeController = () => {
  const router = express.Router();

  /**
   * Check if the badge request is valid
   * @param req - The request object
   * @returns True if the request is valid, false otherwise
   */
  const isBadgeRequestValid = (req: Request): boolean => {
    const { badgeIds } = req.query;
    return Boolean(badgeIds && Array.isArray(badgeIds));
  };

  /**
   * Get badges by their IDs
   * @param req - The request object
   * @param res - The response object
   * @returns The badges
   */
  const getBadgesRoute = async (req: Request, res: Response): Promise<void> => {
    if (!isBadgeRequestValid(req)) {
      res.status(400).json({ error: 'Badge IDs are required' });
      return;
    }
    try {
      const badgeIds = req.query.badgeIds as string[];
      const badges = await getBadgesByIds(badgeIds);
      res.status(200).json(badges);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unknown error occurred' });
      }
    }
  };

  router.get('/badges', getBadgesRoute);
  return router;
};

export default badgeController;
