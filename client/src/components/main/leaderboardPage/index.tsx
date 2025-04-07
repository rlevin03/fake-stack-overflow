// client/src/components/main/leaderboardPage/index.tsx

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';

// Define the LeaderboardUser interface inline
interface LeaderboardUser {
  _id?: string;
  username: string;
  points: number;
}

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:8000');
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined; // Explicitly return undefined for consistency

    socket.on('top10Response', (data: LeaderboardUser[]) => {
      const sorted = [...data].sort((a, b) => b.points - a.points);
      setLeaderboard(sorted);
    });

    socket.on('userRankResponse', (data: { rank: number }) => {
      setUserRank(data.rank);
    });

    socket.emit('getTop10');

    return () => {
      socket.off('top10Response');
      socket.off('userRankResponse');
    };
  }, []);

  return (
    <div className='leaderboard-container'>
      <h1>Leaderboard</h1>
      {leaderboard.length > 0 ? (
        <ol className='leaderboard-list'>
          {leaderboard.map(user => (
            <li key={user._id || user.username} className='leaderboard-item'>
              <span className='leaderboard-username'>{user.username}</span>
              <span className='leaderboard-points'>{user.points} pts</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>No leaderboard data.</p>
      )}
      {userRank !== null && (
        <div className='rank-info'>
          <p>
            Your overall rank: <strong>{userRank}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
