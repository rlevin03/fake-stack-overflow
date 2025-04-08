import { BadgeNameType, BadgeDescriptionType } from '@fake-stack-overflow/shared';
import UserModel from '../models/users.model';
import BadgeModel from '../models/badge.model';
import { awardBadge, saveBadge } from '../services/badge.service';
import { FakeSOSocket } from '../types/types';

/**
 * Adds a badge to the user if it does not exist, and updates the progress of the badge if it does.
 * Emits a socket event to show a notification to the user.
 * @param username the username of the user to award the badge to
 * @param badgeName the name of the badge to award
 * @param badgeDescription the description of the badge to award
 * @param socket (optional) socket instance to emit notifications
 * @returns a promise that resolves to void
 */
async function awardingBadgeHelper(
  username: string,
  badgeName: BadgeNameType,
  badgeDescription: BadgeDescriptionType,
  socket?: FakeSOSocket,
): Promise<void> {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const badgeIds = user.badges;
    const badge = await BadgeModel.findOne({ _id: { $in: badgeIds }, name: badgeName });

    // If the badge doesn't exist, create it and show "working towards" notification
    if (!badge) {
      await saveBadge(username, badgeName, badgeDescription);
      if (socket) {
        socket.emit('badgeNotification', {
          username,
          type: 'progress',
          badgeName,
          message: `You're working towards the ${badgeName} badge!`,
        });
      }
    } else {
      // If badge exists and was awarded, show "awarded" notification
      const updatedBadge = await awardBadge(username, badgeName, badgeDescription);

      // Check if the badge was just earned (progress went from < 100 to 100)
      if (badge.progress < 100 && updatedBadge && updatedBadge.progress === 100) {
        if (socket) {
          socket.emit('badgeNotification', {
            username,
            type: 'awarded',
            badgeName,
            message: `Congratulations! You've earned the ${badgeName} badge!`,
          });
        }
      } else if (socket) {
        // Badge progress was updated
        socket.emit('badgeNotification', {
          username,
          type: 'progress',
          badgeName,
          message: `You're making progress on the ${badgeName} badge!`,
        });
      }
      return;
    }

    await awardBadge(username, badgeName, badgeDescription);
  } catch (error) {
    /* empty */
  }
}

export default awardingBadgeHelper;
