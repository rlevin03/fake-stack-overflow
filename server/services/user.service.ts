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
  PopulatedDatabaseQuestion,
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import CommentModel from '../models/comments.model';

/**
 * Saves a new user to the database.
 *
 * @param {User} user - The user object to be saved, containing user details like username, password, etc.
 * @returns {Promise<UserResponse>} - Resolves with the saved user object (without the password) or an error message.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result: DatabaseUser = await UserModel.create(user);

    if (!result) {
      throw Error('Failed to create user');
    }

    // Remove password field from returned object
    const safeUser: SafeDatabaseUser = {
      _id: result._id,
      username: result.username,
      dateJoined: result.dateJoined,
      biography: result.biography,
      preferences: result.preferences,
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when saving user: ${error}` };
  }
};

/**
 * Retrieves a user from the database by their username.
 *
 * @param {string} username - The username of the user to find.
 * @returns {Promise<UserResponse>} - Resolves with the found user object (without the password) or an error message.
 */
export const getUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username }).select('-password');

    if (!user) {
      throw Error('User not found');
    }

    return user;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Retrieves all users from the database.
 * Users documents are returned in the order in which they were created, oldest to newest.
 *
 * @returns {Promise<UsersResponse>} - Resolves with the found user objects (without the passwords) or an error message.
 */
export const getUsersList = async (): Promise<UsersResponse> => {
  try {
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password');

    if (!users) {
      throw Error('Users could not be retrieved');
    }

    return users;
  } catch (error) {
    return { error: `Error occurred when finding users: ${error}` };
  }
};

/**
 * Authenticates a user by verifying their username and password.
 *
 * @param {UserCredentials} loginCredentials - An object containing the username and password.
 * @returns {Promise<UserResponse>} - Resolves with the authenticated user object (without the password) or an error message.
 */
export const loginUser = async (loginCredentials: UserCredentials): Promise<UserResponse> => {
  const { username, password } = loginCredentials;

  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username, password }).select(
      '-password',
    );

    if (!user) {
      throw Error('Authentication failed');
    }

    return user;
  } catch (error) {
    return { error: `Error occurred when authenticating user: ${error}` };
  }
};

/**
 * Deletes a user from the database by their username.
 *
 * @param {string} username - The username of the user to delete.
 * @returns {Promise<UserResponse>} - Resolves with the deleted user object (without the password) or an error message.
 */
export const deleteUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const deletedUser: SafeDatabaseUser | null = await UserModel.findOneAndDelete({
      username,
    }).select('-password');

    if (!deletedUser) {
      throw Error('Error deleting user');
    }

    return deletedUser;
  } catch (error) {
    return { error: `Error occurred when finding user: ${error}` };
  }
};

/**
 * Updates user information in the database.
 *
 * @param {string} username - The username of the user to update.
 * @param {Partial<User>} updates - An object containing the fields to update and their new values.
 * @returns {Promise<UserResponse>} - Resolves with the updated user object (without the password) or an error message.
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
    ).select('-password');

    if (!updatedUser) {
      throw Error('Error updating user');
    }

    return updatedUser;
  } catch (error) {
    return { error: `Error occurred when updating user: ${error}` };
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

    // Construct a safe user response (include preferences if needed).
    const safeUser: SafeDatabaseUser = {
      _id: user._id,
      username: user.username,
      dateJoined: user.dateJoined,
      biography: user.biography,
      // Optionally, include preferences if desired:
      preferences: user.preferences,
    };

    return safeUser;
  } catch (error) {
    return { error: `Error occurred when updating preferences: ${error}` };
  }
};

/**
 * Retrieves recommendations for a user by comparing the user's preferences
 * with the questions' tag vectors using cosine similarity.
 */
export const getUserRecommendations = async (
  userId: string,
): Promise<{ question: PopulatedDatabaseQuestion; similarity: number }[] | { error: string }> => {
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Retrieve all questions and populate the tags so that we get the full Tag objects.
    // New: retrieve questions with tags fully populated
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
    // We assume each populated tag has a 'name' property.
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

    // Compute similarity for each question.
    const recommendations = await Promise.all(
      questions.map(async question => {
        const questionVector = await tagsToVector(question.tags);
        const similarity = cosineSimilarity(user.preferences, questionVector);
        return { question, similarity };
      }),
    );

    // Sort recommendations from highest similarity to lowest.
    recommendations.sort((a, b) => b.similarity - a.similarity);
    return recommendations;
  } catch (error) {
    return { error: `Error occurred when retrieving recommendations: ${error}` };
  }
};
