// client/src/components/ProfileSettings/index.tsx
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';
import InterestsCard from './InterestsCard';
import { LeaderboardUser } from '../../services/leaderboardService';

// Create a persistent socket connection (adjust URL/port as needed).
const socket: Socket = io('http://localhost:8000');

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

  /**
   * useEffect: Setup socket listeners once loading is done.
   * We'll request the top10 + user rank from the server,
   * and handle real-time updates if the server emits them again.
   */
  useEffect(() => {
    if (!loading) {
      // Listen for server responses
      socket.on('top10Response', (data: LeaderboardUser[]) => {
        // Sort descending by points (just in case)
        const sorted = [...data].sort((a, b) => b.points - a.points);
        setLeaderboard(sorted);
      });

      socket.on('userRankResponse', (data: { rank: number }) => {
        setUserRank(data.rank);
      });

      // Request the latest top 10 from server
      socket.emit('getTop10');

      // If user is logged in, request that user's rank
      if (userData?.username) {
        socket.emit('getUserRank', { username: userData.username });
      }

      // Cleanup on unmount
      return () => {
        socket.off('top10Response');
        socket.off('userRankResponse');
      };
    }
    // If still loading, do nothing special
    return undefined;
  }, [loading, userData]);

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
          <p className='rank-info'>
            Your overall rank: <strong>{userRank}</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
