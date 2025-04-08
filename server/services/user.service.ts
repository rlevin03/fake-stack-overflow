// server/src/services/user.service.ts

import { Types } from 'mongoose';
import tagIndexMap from '@fake-stack-overflow/shared/tagIndexMap.json'; // Adjust path as needed
import QuestionModel from '../models/questions.model';
import TagModel from '../models/tags.model';
import UserModel from '../models/users.model';

import {
  DatabaseComment,
  DatabaseQuestion,
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
import AnswerModel from '../models/answers.model';
import CommentModel from '../models/comments.model';

/**
 * Helper to convert unknown errors to a readable string.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Saves a new user to the database.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result: DatabaseUser = await UserModel.create(user);
    if (!result) {
      throw new Error('Failed to create user');
    }
    // Remove password from the returned object
    const safeUser: SafeDatabaseUser = {
      _id: result._id,
      username: result.username,
      dateJoined: result.dateJoined,
      biography: result.biography,
      preferences: result.preferences,
      points: result.points,
      badges: result.badges,
      aiToggler: result.aiToggler,
    };
    return safeUser;
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
    if (!user) {
      throw new Error('User not found');
    }
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
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password').lean();
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
    if (!user) {
      throw new Error('Authentication failed');
    }
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
    if (!deletedUser) {
      throw new Error('Error deleting user');
    }
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
    if (!updatedUser) {
      throw new Error('Error updating user');
    }
    return updatedUser;
  } catch (error: unknown) {
    return { error: `Error occurred when updating user: ${formatError(error)}` };
  }
};

/**
 * Returns up to 10 users with the highest points, sorted descending (excluding passwords).
 */
export const getTop10ByPoints = async (): Promise<SafeDatabaseUser[] | { error: string }> => {
  try {
    const top10 = await UserModel.find().select('-password').sort({ points: -1 }).limit(10).lean();
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
    if (!user) {
      return { error: 'User not found' };
    }
    const higherPointsCount = await UserModel.countDocuments({ points: { $gt: user.points } });
    const rank = higherPointsCount + 1;
    return { rank };
  } catch (error: unknown) {
    return { error: `Error retrieving user rank: ${formatError(error)}` };
  }
};

/**
 * Updates a user's 1000-dimensional preferences vector.
 * Expects an array of updates: { index: number, value: number }.
 */
export const updateUserPreferences = async (
  userId: string,
  updates: { index: number; value: number }[],
): Promise<UserResponse> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Update each specified index.
    updates.forEach(({ index, value }) => {
      if (index >= 0 && index < 1000) {
        user.preferences[index] += value;
      }
    });
    await user.save();
    // Construct a safe user response.
    const safeUser: SafeDatabaseUser = {
      _id: user._id,
      username: user.username,
      dateJoined: user.dateJoined,
      biography: user.biography,
      preferences: user.preferences,
      points: user.points,
      aiToggler: user.aiToggler,
      badges: user.badges,
    };
    return safeUser;
  } catch (error: unknown) {
    return { error: `Error occurred when updating preferences: ${formatError(error)}` };
  }
};

/**
 * Retrieves recommendations for a user by comparing the user's preferences
 * with the questions' tag vectors using cosine similarity.
 */
/**
 * Retrieves recommendations for a user by comparing the user's preferences
 * with the questions' tag vectors using cosine similarity.
 * Questions already viewed by the user will be placed at the end of the list.
 */
export const getUserRecommendations = async (
  userId: string,
): Promise<
  { question: PopulatedDatabaseQuestionWithViews; similarity: number }[] | { error: string }
> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Retrieve all questions with fully populated tags and related fields.
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

    // Convert an array of Tag objects into a 1000-dimensional binary vector.
    const tagsToVector = (tags: DatabaseTag[]): number[] => {
      const vector = new Array(1000).fill(0);
      for (const tag of tags) {
        const index = (tagIndexMap as Record<string, number>)[tag.name];
        if (index !== undefined) {
          vector[index] = 1;
        }
      }
      return vector;
    };

    // Compute cosine similarity between two vectors.
    const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
      const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      if (normA === 0 || normB === 0) return 0;
      return dot / (normA * normB);
    };

    const recommendations = await Promise.all(
      questions.map(async question => {
        const questionVector = tagsToVector(question.tags);
        const similarity = cosineSimilarity(user.preferences, questionVector);
        // Check if the current user has viewed this question
        const hasViewed = question.views?.includes(user.username) || false;
        return { question, similarity, hasViewed };
      }),
    );

    // Sort by similarity but put viewed questions at the end
    recommendations.sort((a, b) => {
      // If one is viewed and the other is not, the viewed one goes last
      if (a.hasViewed && !b.hasViewed) return 1;
      if (!a.hasViewed && b.hasViewed) return -1;
      // If both are viewed or both are not viewed, sort by similarity
      return b.similarity - a.similarity;
    });

    // Remove the hasViewed property before returning since it's not in the expected return type
    return recommendations.map(({ question, similarity }) => ({ question, similarity }));
  } catch (error: unknown) {
    return { error: `Error occurred when retrieving recommendations: ${formatError(error)}` };
  }
};
