import { Badge, BadgeDescription, BadgeName, User } from '@fake-stack-overflow/shared';
import UserModel from '../models/users.model';
import BadgeModel from '../models/badge.model';

/**
 * Checks the progress of a badge and then awards the badge if the progress is sufficient.
 *
 * @param {string} userId - The id of the user to check the badge for
 * @param {number} progressGained - The progress gained towards the badge
 * @param {BadgeName} badgeName - The badge to check the progress for
 * @returns {Promise<Badge>} - The progress of the badge or if it was awarded successfully
 */
export const awardBadge = async (
  userId: string,
  progressGained: number,
  badgeName: BadgeName,
): Promise<Badge> => {
  try {
    const user: User | null = await UserModel.findById(userId).populate('badges').exec();
    if (!user) {
      throw new Error('User not found');
    }

    const badgeIds = user.badges;
    const badge = await BadgeModel.findOne({ _id: { $in: badgeIds }, name: badgeName });
    if (!badge) {
      throw new Error('Badge not found');
    }

    switch (badgeName) {
      case 'Curious Cat':
        if (badge.progress >= 10) {
          badge.attained = true;
          await badge.save();
          return badge;
        } else {
          badge.progress += progressGained;
          await badge.save();
          return badge;
        }
      case 'Helping Hand':
        if (badge.progress >= 5) {
          badge.attained = true;
          await badge.save();
          return badge;
        } else {
          badge.progress += progressGained;
          await badge.save();
          return badge;
        }
      case 'Lifeline':
        badge.attained = true;
        await badge.save();
        return badge;
      case 'Lightning Responder':
        badge.attained = true;
        await badge.save();
        return badge;
      case 'Respected Voice':
        if (badge.progress >= 500) {
          badge.attained = true;
          await badge.save();
          return badge;
        } else {
          badge.progress += progressGained;
          await badge.save();
          return badge;
        }
      case 'Peoples Champion':
        if (badge.progress >= 50) {
          badge.attained = true;
          await badge.save();
          return badge;
        } else {
          badge.progress += progressGained;
          await badge.save();
          return badge;
        }
      case 'Hidden Gem':
        if (badge.progress >= 10) {
          badge.attained = true;
          await badge.save();
          return badge;
        } else {
          badge.progress += progressGained;
          await badge.save();
          return badge;
        }
      case 'Pair Programmer':
        badge.attained = true;
        await badge.save();
        return badge;
      case 'The Historian':
        badge.attained = true;
        await badge.save();
        return badge;
      default:
        return badge;
    }
  } catch (error) {
    throw new Error(`Error awarding badge: ${error}`);
  }
};

/**
 * Creates a badge with certain name and description.
 * @param {string} userId - The id of the user to create the badge for
 * @param {BadgeName} badgeName - The name of the badge to create
 * @param {BadgeDescription} badgeDescription - The description of the badge to create
 * @returns {Promise<Badge>} - The created badge
 * @throws {Error} - If there is an error creating the badge
 */
export const saveBadge = async (
  userId: string,
  badgeName: BadgeName,
  badgeDescription: BadgeDescription,
): Promise<Badge> => {
  try {
    const badge = await BadgeModel.create({
      badgeName,
      badgeDescription,
    });
    if (!badge) {
      throw new Error('Badge not created');
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.badges.push(badge._id);
    await user.save();
    return badge;
  } catch (error) {
    throw new Error(`Error creating badge: ${error}`);
  }
};
