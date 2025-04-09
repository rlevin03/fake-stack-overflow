// client/src/services/leaderboardService.ts
import { io, Socket } from 'socket.io-client';

export interface LeaderboardUser {
  _id?: string;
  username: string;
  points: number;
}

// Create a single socket connection to the server.
// Adjust the URL if needed.
const socket: Socket = io('https://cs4530-s25-605.onrender.com');

// Helper function to get the top 10 leaderboard using websockets.
export async function getTop10Leaderboard(): Promise<LeaderboardUser[]> {
  return new Promise((resolve, reject) => {
    // Create references to hold our listener functions
    let responseListener: (data: LeaderboardUser[]) => void;
    let errorListener: (msg: string) => void;

    // Create function to clean up listeners
    const cleanupListeners = () => {
      socket.off('top10Response', responseListener);
      socket.off('error', errorListener);
    };

    // Define listeners that don't directly reference each other
    responseListener = (data: LeaderboardUser[]) => {
      cleanupListeners();
      resolve(data);
    };

    errorListener = (msg: string) => {
      cleanupListeners();
      reject(new Error(msg));
    };

    // Emit the event to request top 10 leaderboard.
    socket.emit('getTop10');

    // Register listeners
    socket.once('top10Response', responseListener);
    socket.once('error', errorListener);
  });
}

// Helper function to get a user's rank using websockets.
export async function getUserRank(username: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Create references to hold our listener functions
    let responseListener: (data: { rank: number }) => void;
    let errorListener: (msg: string) => void;

    // Create function to clean up listeners
    const cleanupListeners = () => {
      socket.off('userRankResponse', responseListener);
      socket.off('error', errorListener);
    };

    // Define listeners that don't directly reference each other
    responseListener = (data: { rank: number }) => {
      cleanupListeners();
      resolve(data.rank);
    };

    errorListener = (msg: string) => {
      cleanupListeners();
      reject(new Error(msg));
    };

    // Emit the event with the username.
    socket.emit('getUserRank', { username });

    // Register listeners
    socket.once('userRankResponse', responseListener);
    socket.once('error', errorListener);
  });
}
