import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';
import BadgeComponent from './badgeComponent';
import useUserContext from '../../../hooks/useUserContext';
import PointsHistory from './PointsHistory';

interface LeaderboardUser {
  _id?: string;
  username: string;
  points: number;
}

const LeaderboardPage: React.FC = () => {
  const { user } = useUserContext();
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
    if (!socket) return;

    // Listen for leaderboard data
    const top10Listener = (data: LeaderboardUser[]) => {
      const sorted = [...data].sort((a, b) => b.points - a.points);
      setLeaderboard(sorted);
    };

    // Listen for the user's rank
    const userRankListener = (data: { rank: number }) => {
      setUserRank(data.rank);
    };

    socket.on('top10Response', top10Listener);
    socket.on('userRankResponse', userRankListener);

    // Emit event to get top 10 leaderboard
    socket.emit('getTop10');
    // Emit event to get the user's personal rank – ensure the username exists.
    if (user && user.username) {
      socket.emit('getUserRank', { username: user.username });
    }

    // eslint-disable-next-line consistent-return
    return () => {
      socket.off('top10Response', top10Listener);
      socket.off('userRankResponse', userRankListener);
    };
  }, [user]);

  return (
    <div className='leaderboard-container'>
      <h1>Leaderboard</h1>
      {leaderboard.length > 0 ? (
        <ol className='leaderboard-list'>
          {leaderboard.map(userLeaderboard => (
            <li key={userLeaderboard._id || userLeaderboard.username} className='leaderboard-item'>
              <span className='leaderboard-username'>{userLeaderboard.username}</span>
              <span className='leaderboard-points'>{userLeaderboard.points} pts</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>No leaderboard data.</p>
      )}
      <div className='rank-info'>
        {userRank !== null && (
          <p>
            Your overall rank: <strong>{userRank}</strong>
          </p>
        )}
      </div>
      <div className='mt-8'>
        <h2 className='text-xl font-bold mb-4'>Your Badges</h2>
        <BadgeComponent badgeIds={user.badges.map(id => id.toString())} />
      </div>
      <PointsHistory />
    </div>
  );
};

export default LeaderboardPage;
