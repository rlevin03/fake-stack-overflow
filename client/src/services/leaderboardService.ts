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

    // Response handler: Remove error listener and resolve.
    const onResponse = (data: LeaderboardUser[]) => {
      socket.off('error', onError);
      resolve(data);
    };

    // Error handler: Remove response listener and reject.
    const onError = (msg: string) => {
      socket.off('top10Response', onResponse);
      reject(new Error(msg));
    };

    socket.once('top10Response', onResponse);
    socket.once('error', onError);
  });
}

// Helper function to get a user's rank using websockets.
export async function getUserRank(username: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Emit the event with the username.
    socket.emit('getUserRank', { username });

    // Response handler: Remove error listener and resolve.
    const onResponse = (data: { rank: number }) => {
      socket.off('error', onError);
      resolve(data.rank);
    };

    // Error handler: Remove response listener and reject.
    const onError = (msg: string) => {
      socket.off('userRankResponse', onResponse);
      reject(new Error(msg));
    };

    socket.once('userRankResponse', onResponse);
    socket.once('error', onError);
  });
}
