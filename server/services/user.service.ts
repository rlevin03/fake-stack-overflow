// server/services/user.service.ts

import tagIndexMapRaw from '@fake-stack-overflow/shared/tagIndexMap.json';
import QuestionModel from '../models/questions.model';
import UserModel from '../models/users.model';
import AnswerModel from '../models/answers.model';
import CommentModel from '../models/comments.model';

import {
  DatabaseComment,
  DatabaseTag,
  DatabaseUser,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseQuestionWithViews,
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
} from '../types/types';

// Cast the imported JSON to a record mapping tag names to indices.
const tagIndexMap = tagIndexMapRaw as Record<string, number>;

/**
 * Helper to convert unknown errors to a readable string.
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Helper: Converts a DatabaseUser into a SafeDatabaseUser by omitting the password.
 */
const makeSafeUser = (user: DatabaseUser): SafeDatabaseUser => ({
  _id: user._id,
  username: user.username,
  dateJoined: user.dateJoined,
  biography: user.biography,
  preferences: user.preferences,
  points: user.points,
  badges: user.badges,
  aiToggler: user.aiToggler,
  pointsHistory: user.pointsHistory,
  hideRanking: user.hideRanking,
  lastActive: user.lastActive,
});

/**
 * Saves a new user to the database.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result: DatabaseUser = await UserModel.create(user);
    if (!result) {
      throw new Error('Failed to create user');
    }
    return makeSafeUser(result);
  } catch (error: unknown) {
    return { error: `Error occurred when saving user: ${formatError(error)}` };
  }
};

/**
 * Retrieves a user by their username (excluding password).
 */
export const getUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username })
      .select('-password')
      .lean();
    if (!user) throw new Error('User not found');
    return user;
  } catch (error: unknown) {
    return { error: `Error occurred when finding user: ${formatError(error)}` };
  }
};

/**
 * Retrieves all users (excluding passwords).
 */
export const getUsersList = async (): Promise<UsersResponse> => {
  try {
    // find() may return null when mocked
    const users: SafeDatabaseUser[] | null = await UserModel.find().select('-password').lean();

    if (!users) {
      // return an error object if no users were found
      return { error: 'Users not found' };
    }

    return users;
  } catch (error: unknown) {
    return { error: `Error occurred when finding users: ${formatError(error)}` };
  }
};

/**
 * Authenticates a user by verifying their username and password.
 * (Note: This is not secure for production without hashing!)
 */
export const loginUser = async (loginCredentials: UserCredentials): Promise<UserResponse> => {
  const { username, password } = loginCredentials;
  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username, password })
      .select('-password')
      .lean();
    if (!user) throw new Error('Authentication failed');

    await UserModel.updateOne({ username }, { $set: { lastActive: new Date() } });
    return user;
  } catch (error: unknown) {
    return { error: `Error occurred when authenticating user: ${formatError(error)}` };
  }
};

/**
 * Deletes a user by their username.
 */
export const deleteUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const deletedUser: SafeDatabaseUser | null = await UserModel.findOneAndDelete({ username })
      .select('-password')
      .lean();
    if (!deletedUser) throw new Error('Error deleting user');
    return deletedUser;
  } catch (error: unknown) {
    return { error: `Error occurred when deleting user: ${formatError(error)}` };
  }
};

/**
 * Updates user information in the database.
 */
export const updateUser = async (
  username: string,
  updates: Partial<User>,
): Promise<UserResponse> => {
  try {
    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true },
    )
      .select('-password')
      .lean();
    if (!updatedUser) throw new Error('Error updating user');
    return updatedUser;
  } catch (error: unknown) {
    return { error: `Error occurred when updating user: ${formatError(error)}` };
  }
};

/**
 * Returns up to 10 users with the highest points, sorted descending (excluding users who hide their ranking).
 */
export const getTop10ByPoints = async (): Promise<SafeDatabaseUser[] | { error: string }> => {
  try {
    const top10 = await UserModel.find({ hideRanking: { $ne: true } })
      .select('-password')
      .sort({ points: -1 })
      .limit(10)
      .lean();
    return top10;
  } catch (error: unknown) {
    return { error: `Error retrieving top 10 by points: ${formatError(error)}` };
  }
};

/**
 * Returns the rank of a user by username, based on how many users have strictly more points.
 */
export const getRankForUser = async (
  username: string,
): Promise<{ rank: number } | { error: string }> => {
  try {
    const user = await UserModel.findOne({ username }).lean();
    if (!user) return { error: 'User not found' };

    const higherPointsCount = await UserModel.countDocuments({
      points: { $gt: user.points },
      hideRanking: { $ne: true },
    });
    return { rank: higherPointsCount + 1 };
  } catch (error: unknown) {
    return { error: `Error retrieving user rank: ${formatError(error)}` };
  }
};

/**
 * Updates a user's 1000-dimensional preferences vector.
 */
export const updateUserPreferences = async (
  userId: string,
  updates: { index: number; value: number }[],
): Promise<UserResponse> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    updates.forEach(({ index, value }) => {
      if (index >= 0 && index < 1000) {
        user.preferences[index] = (user.preferences[index] || 0) + value;
      }
    });

    await user.save();
    return makeSafeUser(user.toObject());
  } catch (error: unknown) {
    return { error: `Error occurred when updating preferences: ${formatError(error)}` };
  }
};

/**
 * Appends a new record to the user's pointsHistory.
 */
export const appendPointsHistory = async (
  userId: string,
  historyItem: string,
): Promise<UserResponse> => {
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $push: { pointsHistory: historyItem } },
      { new: true },
    )
      .select('-password')
      .lean();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  } catch (error: unknown) {
    return { error: `Error updating points history: ${formatError(error)}` };
  }
};

/**
 * Retrieves a user's points history by username.
 */
export const getPointsHistory = async (username: string): Promise<string[] | { error: string }> => {
  try {
    const user = await UserModel.findOne({ username }).select('pointsHistory').lean();
    if (!user) throw new Error('User not found');
    return user.pointsHistory || [];
  } catch (error: unknown) {
    return { error: `Error retrieving points history: ${formatError(error)}` };
  }
};

/**
 * Retrieves recommendations for a user by comparing preferences with question tag vectors.
 */
export const getUserRecommendations = async (
  userId: string,
): Promise<
  { question: PopulatedDatabaseQuestionWithViews; similarity: number }[] | { error: string }
> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('User not found');

    const questions = await QuestionModel.find()
      .populate<{ tags: DatabaseTag[] }>('tags')
      .populate<{ answers: PopulatedDatabaseAnswer[] }>({
        path: 'answers',
        model: AnswerModel,
        populate: { path: 'comments', model: CommentModel },
      })
      .populate<{ comments: DatabaseComment[] }>({
        path: 'comments',
        model: CommentModel,
      })
      .exec();

    const tagsToVector = (tags: DatabaseTag[]): number[] => {
      const vector = new Array(1000).fill(0);
      for (const tag of tags) {
        const idx = tagIndexMap[tag.name];
        if (idx !== undefined) vector[idx] = 1;
      }
      return vector;
    };

    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
      const normA = Math.hypot(...a);
      const normB = Math.hypot(...b);
      return normA && normB ? dot / (normA * normB) : 0;
    };

    const recs = await Promise.all(
      questions.map(q => {
        const sim = cosineSimilarity(user.preferences, tagsToVector(q.tags));
        const hasViewed = q.views?.includes(user.username) ?? false;
        return { question: q, similarity: sim, hasViewed };
      }),
    );

    recs.sort((x, y) => {
      if (x.hasViewed === y.hasViewed) {
        return y.similarity - x.similarity;
      }
      return x.hasViewed ? 1 : -1;
    });

    return recs.map(({ question, similarity }) => ({ question, similarity }));
  } catch (error: unknown) {
    return { error: `Error occurred when retrieving recommendations: ${formatError(error)}` };
  }
};

/**
 * DECAY FUNCTION:
 * Decays points for users who haven't logged in for 60 days.
 */
export const decayInactiveUserPoints = async (): Promise<void> => {
  try {
    const now = Date.now();
    const cutoff = now - 60 * 24 * 60 * 60 * 1000;
    const inactive = await UserModel.find({ lastActive: { $lt: cutoff } });

    await Promise.all(
      inactive.map(u => {
        const days = Math.floor((now - u.lastActive.getTime()) / (24 * 60 * 60 * 1000));
        const periods = Math.floor(days / 30);
        if (periods > 0) {
          const newPts = Math.floor(u.points * 0.9 ** periods);
          return UserModel.updateOne(
            { _id: u._id },
            {
              $set: { points: newPts },
              $push: {
                pointsHistory: `Decayed from ${u.points} to ${newPts} after ${periods} period(s).`,
              },
            },
          );
        }
        return Promise.resolve();
      }),
    );
  } catch (error: unknown) {
    // Just swallow the error - this is a background task that shouldn't fail the application
  }
};
