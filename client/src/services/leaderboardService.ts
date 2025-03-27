// client/src/services/leaderboardService.ts

const API_BASE = 'http://localhost:8000';

/**
 * Interface for the user objects returned by the leaderboard.
 */
export interface LeaderboardUser {
  _id?: string;
  username: string;
  points: number;
}

/**
 * Fetch top 10 users sorted by points (descending).
 * Returns an array of LeaderboardUser objects.
 */
export async function getTop10Leaderboard(): Promise<LeaderboardUser[]> {
  // Because you mounted your user routes at /user,
  // the final URL for top10 is /user/top10 (NOT /api/users/top10).
  const response = await fetch(`${API_BASE}/user/top10`);
  if (!response.ok) {
    throw new Error(`Failed to fetch top 10. Status: ${response.status} ${response.statusText}`);
  }
  // Cast or parse JSON as LeaderboardUser[]
  return response.json() as Promise<LeaderboardUser[]>;
}

/**
 * Fetch the rank for a specific user.
 * Returns a number (the rank).
 */
export async function getUserRank(username: string): Promise<number> {
  // Because you mounted your user routes at /user,
  // the final URL for rank is /user/leaderboard/user-rank?username=...
  const response = await fetch(
    `${API_BASE}/user/leaderboard/user-rank?username=${encodeURIComponent(username)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch user rank. Status: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.rank;
}
