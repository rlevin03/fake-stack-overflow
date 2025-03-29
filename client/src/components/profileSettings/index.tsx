// client/src/components/ProfileSettings/index.tsx

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';
import InterestsCard from './InterestsCard';
import { LeaderboardUser } from '../../services/leaderboardService';

interface UserData {
  username: string;
  biography?: string;
  dateJoined?: string;
  // Add other fields as needed...
}

const ProfileSettings: React.FC = () => {
  const {
    userData,
    loading,
    editBioMode,
    newBio,
    newPassword,
    confirmNewPassword,
    successMessage,
    errorMessage,
    showConfirmation,
    pendingAction,
    canEditProfile,
    showPassword,
    togglePasswordVisibility,
    setEditBioMode,
    setNewBio,
    setNewPassword,
    setConfirmNewPassword,
    setShowConfirmation,
    handleResetPassword,
    handleUpdateBiography,
    handleDeleteUser,
  } = useProfileSettings();

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Create a socket ref to persist the socket connection.
  const socketRef = useRef<Socket | null>(null);

  // Initialize the socket connection when the component mounts.
  useEffect(() => {
    socketRef.current = io('http://localhost:8000');

    // Disconnect the socket when the component unmounts.
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  /**
   * Setup socket listeners once loading is done.
   * We'll request the top 10 and user rank from the server,
   * and handle real-time updates.
   */
  useEffect(() => {
    if (loading) {
      // Return an empty cleanup function if still loading.
      return () => {};
    }

    const socket = socketRef.current;
    if (!socket) {
      // Return an empty cleanup function if socket isn't available.
      return () => {};
    }

    // Listen for server responses
    socket.on('top10Response', (data: LeaderboardUser[]) => {
      const sorted = [...data].sort((a, b) => b.points - a.points);
      setLeaderboard(sorted);
    });

    socket.on('userRankResponse', (data: { rank: number }) => {
      setUserRank(data.rank);
    });

    // Request data from the server
    socket.emit('getTop10');
    if (userData?.username) {
      socket.emit('getUserRank', { username: userData.username });
    }

    // Return cleanup function to remove listeners on unmount.
    return () => {
      socket.off('top10Response');
      socket.off('userRankResponse');
    };
  }, [loading, userData]);

  // Locate the current user entry in the leaderboard, if it exists.
  const currentUserEntry = leaderboard.find(item => item.username === userData?.username);

  return (
    <div className='page-container' style={{ display: 'flex', gap: '2rem' }}>
      {/* ---------------- PROFILE CARD ---------------- */}
      <div className='profile-card' style={{ flex: 1 }}>
        <h2>Profile</h2>
        {successMessage && <p className='success-message'>{successMessage}</p>}
        {errorMessage && <p className='error-message'>{errorMessage}</p>}

        {userData ? (
          <>
            <h4>General Information</h4>
            <p>
              <strong>Username:</strong> {userData.username}
            </p>

            {/* Biography Section */}
            {!editBioMode && (
              <p>
                <strong>Biography:</strong> {userData.biography || 'No biography yet.'}
                {canEditProfile && (
                  <button
                    className='login-button'
                    style={{ marginLeft: '1rem' }}
                    onClick={() => {
                      setEditBioMode(true);
                      setNewBio(userData.biography || '');
                    }}>
                    Edit
                  </button>
                )}
              </p>
            )}

            {editBioMode && canEditProfile && (
              <div style={{ margin: '1rem 0' }}>
                <input
                  className='input-text'
                  type='text'
                  value={newBio}
                  onChange={e => setNewBio(e.target.value)}
                />
                <button
                  className='login-button'
                  style={{ marginLeft: '1rem' }}
                  onClick={handleUpdateBiography}>
                  Save
                </button>
                <button
                  className='delete-button'
                  style={{ marginLeft: '1rem' }}
                  onClick={() => setEditBioMode(false)}>
                  Cancel
                </button>
              </div>
            )}

            <p>
              <strong>Date Joined:</strong>{' '}
              {userData.dateJoined ? new Date(userData.dateJoined).toLocaleDateString() : 'N/A'}
            </p>

            {/* ---- Interests/Preferences Section ---- */}
            {canEditProfile && <InterestsCard />}

            {/* Reset Password Section */}
            {canEditProfile && (
              <>
                <h4>Reset Password</h4>
                <input
                  className='input-text'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='New Password'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  className='input-text'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Confirm New Password'
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                />
                <button className='toggle-password-button' onClick={togglePasswordVisibility}>
                  {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                </button>
                <button className='login-button' onClick={handleResetPassword}>
                  Reset
                </button>
              </>
            )}

            {/* Danger Zone */}
            {canEditProfile && (
              <>
                <h4>Danger Zone</h4>
                <button className='delete-button' onClick={handleDeleteUser}>
                  Delete This User
                </button>
              </>
            )}
          </>
        ) : (
          <p>No user data found. Make sure the username parameter is correct.</p>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className='modal'>
            <div className='modal-content'>
              <p>
                Are you sure you want to delete user <strong>{userData?.username}</strong>? This
                action cannot be undone.
              </p>
              <button className='delete-button' onClick={() => pendingAction && pendingAction()}>
                Confirm
              </button>
              <button className='cancel-button' onClick={() => setShowConfirmation(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- LEADERBOARD CARD ---------------- */}
      <div className='profile-card leaderboard-container'>
        <h2>Leaderboard</h2>
        {leaderboard.length > 0 ? (
          <ol className='leaderboard-list'>
            {leaderboard.map(user => (
              <li key={user._id || user.username} className='leaderboard-item'>
                <span className='leaderboard-username' style={{ fontWeight: 'normal' }}>
                  {user.username}
                </span>
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
            {currentUserEntry && (
              <p>
                <strong>{currentUserEntry.username}</strong> has{' '}
                <strong>{currentUserEntry.points} pts</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
