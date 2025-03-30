// client/src/services/leaderboardService.ts
import { io, Socket } from 'socket.io-client';

export interface LeaderboardUser {
  _id?: string;
  username: string;
  points: number;
}

// Create a single socket connection to the server.
// Adjust the URL if needed.
const socket: Socket = io('http://localhost:8000');

// Helper function to get the top 10 leaderboard using websockets.
export async function getTop10Leaderboard(): Promise<LeaderboardUser[]> {
  return new Promise((resolve, reject) => {
    // Emit the event to request top 10 leaderboard.
    socket.emit('getTop10');
    // Listen for the response event (use 'once' so it only listens for a single response).
    socket.once('top10Response', (data: LeaderboardUser[]) => {
      resolve(data);
    });
    // Listen for an error event.
    socket.once('error', (msg: string) => {
      reject(new Error(msg));
    });
  });
}

// Helper function to get a user's rank using websockets.
export async function getUserRank(username: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Emit the event with the username.
    socket.emit('getUserRank', { username });
    // Listen for the rank response.
    socket.once('userRankResponse', (data: { rank: number }) => {
      resolve(data.rank);
    });
    // Listen for an error event.
    socket.once('error', (msg: string) => {
      reject(new Error(msg));
    });
  });
}
