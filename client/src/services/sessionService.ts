import axios from 'axios';
import { DatabaseSession } from '../types/types';

const SESSION_API_URL = `${process.env.REACT_APP_SERVER_URL}/sessions`;

/**
 * Calls the backend to create a new session.
 * Expects a username in the request body.
 * @returns A session document or throws an error.
 */
export const createSessionAPI = async (username: string): Promise<DatabaseSession> => {
  const response = await axios.post<DatabaseSession>(`${SESSION_API_URL}`, { username });
  if (response.status !== 200) {
    throw new Error('Error creating session YOLO');
  }
  return response.data;
};

/**
 * Calls the backend to retrieve the current user’s sessions by username.
 * @returns An array of session documents or throws an error.
 */
export const getUserSessionsAPI = async (username: string): Promise<DatabaseSession[]> => {
  const response = await axios.get<DatabaseSession[]>(`${SESSION_API_URL}/${username}/sessions`);
  if (response.status !== 200) {
    throw new Error('Error loading sessions');
  }
  return response.data;
};
