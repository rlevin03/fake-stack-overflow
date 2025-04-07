import { Badge } from '../types/types';
import api from './config';

const BADGE_API_URL = `${process.env.REACT_APP_SERVER_URL}/badge`;

export const getBadges = async (badgeIds: string[]): Promise<Badge[]> => {
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
