import UserModel from '../models/users.model';
import BadgeModel from '../models/badge.model';
import { BadgeNameType, BadgeDescriptionType } from '@fake-stack-overflow/shared';
import { awardBadge, saveBadge } from '../services/badge.service';

/**
 * Adds a badge to the user if it does not exist, and updates the progress of the badge if it does.
 * @param username the username of the user to award the badge to
 * @param badgeName the name of the badge to award
 * @param badgeDescription the description of the badge to award
 * @returns a promise that resolves to void
 */
export async function awardingBadgeHelper(
  username: string,
  badgeName: BadgeNameType,
  badgeDescription: BadgeDescriptionType,
): Promise<void> {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }
    const badgeIds = user.badges;
    const badge = await BadgeModel.findOne({ _id: { $in: badgeIds }, name: badgeName });
    if (!badge) {
      await saveBadge(username, badgeName, badgeDescription);
    }

    await awardBadge(username, badgeName, badgeDescription);
  } catch (error) {
    console.error(`Error in awarding badge: ${error}`);
  }
}
