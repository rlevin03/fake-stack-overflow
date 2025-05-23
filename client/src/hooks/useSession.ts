import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createSessionAPI, getUserSessionsAPI } from '../services/sessionService';
import { DatabaseSession } from '../types/types';

const useSession = () => {
  const { username } = useParams<{ username: string }>();
  const [userSessions, setUserSessions] = useState<DatabaseSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new collaborative session.
   * @returns The newly created session document.
   */
  const createSession = async (): Promise<DatabaseSession> => {
    if (!username) {
      throw new Error('Username not provided');
    }
    return createSessionAPI(username);
  };

  /**
   * Fetch the current user's previous sessions from the server.
   */
  const fetchUserSessions = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!username) {
        throw new Error('Username not provided');
      }
      const sessions = await getUserSessionsAPI(username);
      setUserSessions(sessions);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  // Separate useEffect for initial data fetching
  useEffect(() => {
    // Define an inline function for fetching data
    const loadInitialData = async () => {
      if (username) {
        setLoading(true);
        try {
          const sessions = await getUserSessionsAPI(username);
          setUserSessions(sessions);
          setError(null);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load sessions');
          }
        } finally {
          setLoading(false);
        }
      }
    };

    loadInitialData();
  }, [username]);

  return {
    userSessions,
    loading,
    error,
    fetchUserSessions,
    createSession,
  };
};

export default useSession;
