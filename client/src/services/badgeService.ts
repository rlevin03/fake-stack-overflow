import { Badge } from '../types/types';
import api from './config';

const BADGE_API_URL = `https://cs4530-s25-605-api.onrender.com/badge`;

/**
 * Fetches badges by their IDs
 * @param badgeIds Array of badge IDs to fetch
 * @returns Promise resolving to an array of Badge objects
 */
const getBadges = async (badgeIds: string[]): Promise<Badge[]> => {
  try {
    const res = await api.get(`${BADGE_API_URL}/badges`, {
      params: { badgeIds },
    });
    return res.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }
    throw new Error('Failed to fetch badges: Unknown error occurred');
  }
};

export default getBadges;
