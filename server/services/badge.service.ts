import UserModel from '../models/users.model';
import BadgeModel from '../models/badge.model';
import { Badge, BadgeNameType, BadgeDescriptionType } from '../types/types';
import { BadgeName } from '../types/badgeConstants';

/**
 * Checks the progress of a badge and then awards the badge if the progress is sufficient.
 * @param {string} username - The username of the user to check the badge for
 * @param {BadgeNameType} badgeName - The badge to check the progress for
 * @param {BadgeDescriptionType} badgeDescription - The description of the badge
 * @param {number} progressIncrement - The amount to increment the progress by
 * @returns {Promise<Badge>} - The progress of the badge or if it was awarded successfully
 */
export const awardBadge = async (
  username: string,
  badgeName: BadgeNameType,
  badgeDescription: BadgeDescriptionType,
  progressIncrement: number = 1,
): Promise<Badge> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const badgeIds = user.badges;
    let badge = await BadgeModel.findOne({ _id: { $in: badgeIds }, name: badgeName });

    // If badge doesn't exist, create it first
    if (!badge) {
      badge = await BadgeModel.create({
        name: badgeName,
        description: badgeDescription,
        progress: 0,
        attained: false,
      });
      user.badges.push(badge._id);
      await user.save();
    }

    switch (badgeName) {
      case BadgeName.CURIOUS_CAT:
        if (badge.progress >= 10) {
          badge.attained = true;
        } else {
          badge.progress += progressIncrement;
        }
        break;
      case BadgeName.HELPING_HAND:
        if (badge.progress >= 5) {
          badge.attained = true;
        } else {
          badge.progress += progressIncrement;
        }
        break;
      case BadgeName.RESPECTED_VOICE:
        if (badge.progress >= 500) {
          badge.attained = true;
        } else {
          badge.progress += progressIncrement;
        }
        break;
      default:
        // If the badge has no associated progress, we assume
        // it is automatically attained if the service is called.
        badge.attained = true;
        break;
    }
    await badge.save();
    return badge;
  } catch (error) {
    throw new Error(`Error awarding badge: ${error}`);
  }
};

/**
 * Creates a badge with certain name and description.
 * @param {string} username - The username of the user to create the badge for
 * @param {BadgeNameType} badgeName - The name of the badge to create
 * @param {BadgeDescriptionType} badgeDescription - The description of the badge to create
 * @returns {Promise<Badge>} - The created badge
 * @throws {Error} - If there is an error creating the badge
 */
export const saveBadge = async (
  username: string,
  badgeName: BadgeNameType,
  badgeDescription: BadgeDescriptionType,
): Promise<Badge> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const badge = await BadgeModel.create({
      name: badgeName,
      description: badgeDescription,
      progress: 0,
      attained: false,
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

export const getBadgesByIds = async (badgeIds: string[]): Promise<Badge[]> => {
  try {
    const badges = await BadgeModel.find({ _id: { $in: badgeIds } });
    return badges;
  } catch (error) {
    throw new Error(`Error getting badges: ${error}`);
  }
};
