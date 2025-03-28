import { GrantBadgeRequest } from '@fake-stack-overflow/shared';
import { awardBadge } from '../services/badge.service';
import express, { Response, Router } from 'express';

/**
 * This controller handles badge-related routes.
 * @returns {express.Router} The router object containing the badge routes.
 * @throws {Error} Throws an error if the badge creation fails.
 */
const badgeController = () => {
  const router: Router = express.Router();
  /**
   * Validates that the request body contains all required fields for a badge.
   * @param req The incoming request containing badge data.
   * @returns `true` if the body contains valid badge fields; otherwise, `false`.
   */
  const isGrantBadgeRequestValid = (req: GrantBadgeRequest): boolean => {
    return (
      req.params.userId !== undefined &&
      req.body.badgeName !== undefined &&
      req.body.progressGained !== undefined
    );
  };

  /**
   * Handles the granting of a badge to a user.
   * @param req The incoming request containing badge data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the badge is granted.
   * @throws {Error} Throws an error if the badge granting fails.
   */
  const checkBadge = async (req: GrantBadgeRequest, res: Response): Promise<void> => {
    if (!isGrantBadgeRequestValid(req)) {
      res.status(400).send('Invalid badge body');
      return;
    }
    const { userId } = req.params;
    const { badgeName, progressGained } = req.body;
    try {
      const badge = await awardBadge(userId, progressGained, badgeName);
      if ('error' in badge) {
        throw Error('Badge not found or error in awarding badge');
      }
      res.status(200).json(badge);
    } catch (error) {
      res.status(500).send(`Error when checking badge: ${error}`);
    }
  };

  router.post('checkBadge/:userId', checkBadge);

  return router;
};

export default badgeController;
