import { Badge, BadgeDescription, BadgeName, User } from '@fake-stack-overflow/shared';
import UserModel from '../models/users.model';
import BadgeModel from '../models/badge.model';

/**
 * Checks the progress of a badge and then awards the badge if the progress is sufficient.
 * @param {string} username - The username of the user to check the badge for
 * @param {BadgeName} badgeName - The badge to check the progress for
 * @returns {Promise<Badge>} - The progress of the badge or if it was awarded successfully
 */
export const awardBadge = async (username: string, badgeName: BadgeName): Promise<Badge> => {
  try {
    const user: User | null = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const badgeIds = user.badges;
    const badge = await BadgeModel.findOne({ _id: { $in: badgeIds }, name: badgeName });
    if (!badge) {
      throw new Error('Badge not found');
    }

    switch (badgeName) {
      case BadgeName.CURIOUS_CAT:
        if (badge.progress >= 10) {
          badge.attained = true;
        } else {
          badge.progress += 1;
        }
      case BadgeName.HELPING_HAND:
        if (badge.progress >= 5) {
          badge.attained = true;
        } else {
          badge.progress += 1;
        }
      case BadgeName.RESPECTED_VOICE:
        if (badge.progress >= 500) {
          badge.attained = true;
        } else {
          badge.progress += 1;
        }
      default:
        // If the badge has no associated progress, we assume
        // it is automatically attained if the service is called.
        badge.attained = true;
    }
    await badge.save();
    return badge;
  } catch (error) {
    throw new Error(`Error awarding badge: ${error}`);
  }
};

/**
 * Creates a badge with certain name and description.
 * @param {string} username - The uername of the user to create the badge for
 * @param {BadgeName} badgeName - The name of the badge to create
 * @param {BadgeDescription} badgeDescription - The description of the badge to create
 * @returns {Promise<Badge>} - The created badge
 * @throws {Error} - If there is an error creating the badge
 */
export const saveBadge = async (
  username: string,
  badgeName: BadgeName,
  badgeDescription: BadgeDescription,
): Promise<Badge> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const badge = await BadgeModel.create({
      badgeName,
      badgeDescription,
    });
    if (!badge) {
      throw new Error('Badge not created');
    }

    user.badges.push(badge._id);
    await user.save();
    return badge;
  } catch (error) {
    throw new Error(`Error creating badge: ${error}`);
  }
};
