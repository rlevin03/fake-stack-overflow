// client/src/components/main/leaderboardPage/PointsHistory.tsx
import React, { useEffect, useState } from 'react';
import { getPointsHistory } from '../../../services/userService';
import useUserContext from '../../../hooks/useUserContext';
import './PointsHistory.css';

const PointsHistory: React.FC = () => {
  const { user } = useUserContext();
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user.username) return;
    getPointsHistory(user.username)
      .then(data => {
        setHistory(data);
      })
      .catch(err => setError(err.message));
  }, [user.username]);

  return (
    <div className='points-history-container'>
      <h3>Your Points History</h3>
      {error && <p className='error'>{error}</p>}
      {history.length === 0 ? (
        <p>No points history available.</p>
      ) : (
        <ul>
          {history.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PointsHistory;
