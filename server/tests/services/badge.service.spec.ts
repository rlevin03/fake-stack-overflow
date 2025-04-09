import mongoose from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

import BadgeModel from '../../models/badge.model';
import UserModel from '../../models/users.model';
import { awardBadge, saveBadge, getBadgesByIds } from '../../services/badge.service';
import { BadgeName, BadgeDescription } from '../../types/badgeConstants';

describe('Badge Service', () => {
  const badgeId = new mongoose.Types.ObjectId();
  const userDoc = {
    _id: new mongoose.Types.ObjectId(),
    username: 'john',
    badges: [],
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  describe('awardBadge', () => {
    it('should award an existing badge and update progress', async () => {
        const badgeDoc = {
          _id: badgeId,
          name: BadgeName.HELPING_HAND,
          description: BadgeDescription.HELPING_HAND,
          progress: 5,
          attained: false,
          save: jest.fn().mockResolvedValue(undefined),
          toObject: () => ({
            _id: badgeId,
            name: BadgeName.HELPING_HAND,
            description: BadgeDescription.HELPING_HAND,
            progress: 6, // <-- incremented
            attained: true,
          }),
        };
      
        mockingoose(UserModel).toReturn(userDoc, 'findOne');
        mockingoose(BadgeModel).toReturn(badgeDoc, 'findOne');
      
        const result = await awardBadge('john', BadgeName.HELPING_HAND, BadgeDescription.HELPING_HAND);
        expect(result.attained).toBe(true);
      });
      
    it('should set attained to true for RESPECTED_VOICE when progress meets threshold', async () => {
      const badgeDoc = {
        _id: badgeId,
        name: BadgeName.RESPECTED_VOICE,
        description: BadgeDescription.RESPECTED_VOICE,
        progress: 500,
        attained: false,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          _id: badgeId,
          name: BadgeName.RESPECTED_VOICE,
          description: BadgeDescription.RESPECTED_VOICE,
          progress: 500,
          attained: true,
        }),
      };

      mockingoose(UserModel).toReturn(userDoc, 'findOne');
      mockingoose(BadgeModel).toReturn(badgeDoc, 'findOne');

      const result = await awardBadge('john', BadgeName.RESPECTED_VOICE, BadgeDescription.RESPECTED_VOICE);
      expect(result.attained).toBe(true);
    });

    it('should automatically attain badge for default case', async () => {
      const badgeDoc = {
        _id: badgeId,
        name: BadgeName.THE_HISTORIAN,
        description: BadgeDescription.THE_HISTORIAN,
        progress: 0,
        attained: false,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          _id: badgeId,
          name: BadgeName.THE_HISTORIAN,
          description: BadgeDescription.THE_HISTORIAN,
          progress: 0,
          attained: true,
        }),
      };

      mockingoose(UserModel).toReturn(userDoc, 'findOne');
      mockingoose(BadgeModel).toReturn(badgeDoc, 'findOne');

      const result = await awardBadge('john', BadgeName.THE_HISTORIAN, BadgeDescription.THE_HISTORIAN);
      expect(result.attained).toBe(true);
    });

    it('should create a badge and attach it to the user if badge not found', async () => {
        mockingoose(UserModel).toReturn(userDoc, 'findOne');
        mockingoose(BadgeModel).toReturn(null, 'findOne');
      
        const createdBadge = {
          _id: badgeId,
          name: BadgeName.CURIOUS_CAT,
          description: BadgeDescription.CURIOUS_CAT,
          progress: 0,
          attained: false,
          save: jest.fn().mockResolvedValue(undefined),
          toObject: () => ({
            _id: badgeId,
            name: BadgeName.CURIOUS_CAT,
            description: BadgeDescription.CURIOUS_CAT,
            progress: 1, // <-- incremented from 0
            attained: false,
          }),
        };
      
        jest.spyOn(BadgeModel, 'create').mockResolvedValueOnce(createdBadge as any);
      
        const result = await awardBadge('john', BadgeName.CURIOUS_CAT, BadgeDescription.CURIOUS_CAT);
        expect(result.progress).toBe(1);
      });
      

    it('should throw an error if user not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      await expect(
        awardBadge('invalid_user', BadgeName.CURIOUS_CAT, BadgeDescription.CURIOUS_CAT),
      ).rejects.toThrow('User not found');
    });
  });

  describe('saveBadge', () => {
    it('should create and attach a new badge to the user', async () => {
      const newBadge = {
        _id: badgeId,
        name: BadgeName.PAIR_PROGRAMMER,
        description: BadgeDescription.PAIR_PROGRAMMER,
        progress: 0,
        attained: false,
        toObject: () => ({
          _id: badgeId,
          name: BadgeName.PAIR_PROGRAMMER,
          description: BadgeDescription.PAIR_PROGRAMMER,
          progress: 0,
          attained: false,
        }),
      };

      mockingoose(UserModel).toReturn(userDoc, 'findOne');
      jest.spyOn(BadgeModel, 'create').mockResolvedValueOnce(newBadge as any);

      const result = await saveBadge('john', BadgeName.PAIR_PROGRAMMER, BadgeDescription.PAIR_PROGRAMMER);
      expect(result.name).toBe(BadgeName.PAIR_PROGRAMMER);
    });

    it('should throw an error if user not found', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      await expect(
        saveBadge('invalid_user', BadgeName.PAIR_PROGRAMMER, BadgeDescription.PAIR_PROGRAMMER),
      ).rejects.toThrow('User not found');
    });

    it('should throw an error if badge creation fails', async () => {
      mockingoose(UserModel).toReturn(userDoc, 'findOne');
      jest.spyOn(BadgeModel, 'create').mockRejectedValueOnce(new Error('fail'));

      await expect(
        saveBadge('john', BadgeName.CURIOUS_CAT, BadgeDescription.CURIOUS_CAT),
      ).rejects.toThrow('Error creating badge');
    });
  });

  describe('getBadgesByIds', () => {
    it('should return badges for valid ids', async () => {
      const badges = [
        { _id: badgeId, name: BadgeName.LIFELINE, description: BadgeDescription.LIFELINE },
      ];

      mockingoose(BadgeModel).toReturn(badges, 'find');

      const result = await getBadgesByIds([badgeId.toString()]);
      expect(result.length).toBe(1);
      expect((result[0] as any)._id.toString()).toBe(badgeId.toString());
    });

    it('should throw error if badge lookup fails', async () => {
      mockingoose(BadgeModel).toReturn(new Error('DB error'), 'find');

      await expect(getBadgesByIds([badgeId.toString()])).rejects.toThrow('Error getting badges');
    });
  });
});
