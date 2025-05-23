import axios from 'axios';
import { UserCredentials, SafeDatabaseUser, DatabaseQuestion } from '../types/types';
import api from './config';

const USER_API_URL = `${process.env.REACT_APP_SERVER_URL}/user`;

/**
 * Function to get users
 *
 * @throws Error if there is an issue fetching users.
 */
const getUsers = async (): Promise<SafeDatabaseUser[]> => {
  const res = await api.get(`${USER_API_URL}/getUsers`);
  if (res.status !== 200) {
    throw new Error('Error when fetching users');
  }
  return res.data;
};

/**
 * Function to get users
 *
 * @throws Error if there is an issue fetching users.
 */
const getUserByUsername = async (username: string): Promise<SafeDatabaseUser> => {
  const res = await api.get(`${USER_API_URL}/getUser/${username}`);
  if (res.status !== 200) {
    throw new Error('Error when fetching user');
  }
  return res.data;
};

/**
 * Sends a POST request to create a new user account.
 *
 * @param user - The user credentials (username and password) for signup.
 * @returns {Promise<User>} The newly created user object.
 * @throws {Error} If an error occurs during the signup process.
 */
const createUser = async (user: UserCredentials): Promise<SafeDatabaseUser> => {
  try {
    const res = await api.post(`${USER_API_URL}/signup`, user);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Error while signing up: ${error.response.data}`);
    } else {
      throw new Error('Error while signing up');
    }
  }
};

/**
 * Sends a POST request to authenticate a user.
 *
 * @param user - The user credentials (username and password) for login.
 * @returns {Promise<User>} The authenticated user object.
 * @throws {Error} If an error occurs during the login process.
 */
const loginUser = async (user: UserCredentials): Promise<SafeDatabaseUser> => {
  try {
    // eslint-disable-next-line no-console
    console.log(`${USER_API_URL}`);
    const res = await api.post(`${USER_API_URL}/login`, user);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Error while logging in: ${error.response.data}`);
    } else {
      throw new Error('Error while logging in');
    }
  }
};

/**
 * Deletes a user by their username.
 * @param username - The unique username of the user
 * @returns A promise that resolves to the deleted user data
 * @throws {Error} If the request to the server is unsuccessful
 */
const deleteUser = async (username: string): Promise<SafeDatabaseUser> => {
  const res = await api.delete(`${USER_API_URL}/deleteUser/${username}`);
  if (res.status !== 200) {
    throw new Error('Error when deleting user');
  }
  return res.data;
};

/**
 * Resets the password for a user.
 * @param username - The unique username of the user
 * @param newPassword - The new password to be set for the user
 * @returns A promise that resolves to the updated user data
 * @throws {Error} If the request to the server is unsuccessful
 */
const resetPassword = async (username: string, newPassword: string): Promise<SafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/resetPassword`, {
    username,
    password: newPassword,
  });
  if (res.status !== 200) {
    throw new Error('Error when resetting password');
  }
  return res.data;
};

/**
 * Updates the user's biography.
 * @param username The unique username of the user
 * @param newBiography The new biography to set for this user
 * @returns A promise resolving to the updated user
 * @throws Error if the request fails
 */
const updateBiography = async (
  username: string,
  newBiography: string,
): Promise<SafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/updateBiography`, {
    username,
    biography: newBiography,
  });
  if (res.status !== 200) {
    throw new Error('Error when updating biography');
  }
  return res.data;
};

/**
 * Retrieves personalized question recommendations for a user.
 * This function calls the backend endpoint GET /getRecommendations/:userId,
 * which returns an array of objects containing a question and its similarity score.
 *
 * @param userId - The unique id of the user.
 * @returns A promise that resolves to an array of recommended questions along with similarity scores.
 * @throws Error if there is an issue fetching recommendations.
 */
const getRecommendations = async (
  userId: string,
): Promise<{ question: DatabaseQuestion; similarity: number }[]> => {
  const res = await api.get(`${USER_API_URL}/getRecommendations/${userId}`);
  if (res.status !== 200) {
    throw new Error('Error when fetching recommendations');
  }
  return res.data;
};

/**
 * Updates the user's preferences.
 * @param userId - The ID of the user.
 * @param updates - An array of { index, value } updates.
 * @returns The updated user.
 */
const updatePreferences = async (
  userId: string,
  updates: { index: number; value: number }[],
): Promise<SafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/updatePreferences`, { userId, updates });
  if (res.status !== 200) {
    throw new Error('Error when updating preferences');
  }
  return res.data;
};

/**
 * Updates the user's AI toggle setting.
 * @param username - The unique username of the user.
 * @param aiToggler - The new AI toggle setting.
 * @returns The updated user object.
 */
const updateAIToggler = async (username: string, aiToggler: boolean): Promise<SafeDatabaseUser> => {
  const res = await api.patch(`${USER_API_URL}/updateAIToggler`, { username, aiToggler });
  if (res.status !== 200) {
    throw new Error('Error when updating AI toggle');
  }
  return res.data;
};

/**
 * Retrieves the points history for a given username.
 */
const getPointsHistory = async (username: string): Promise<string[]> => {
  const res = await api.get(`${USER_API_URL}/pointsHistory/${username}`);
  if (res.status !== 200) {
    throw new Error('Error when fetching points history');
  }
  return res.data;
};

export {
  getUsers,
  getUserByUsername,
  loginUser,
  createUser,
  deleteUser,
  resetPassword,
  updateBiography,
  getRecommendations,
  updatePreferences,
  updateAIToggler,
  getPointsHistory,
};
