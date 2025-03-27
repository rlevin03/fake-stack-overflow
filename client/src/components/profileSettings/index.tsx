// client/src/components/ProfileSettings/index.tsx
import React, { useEffect, useState } from 'react';
import './index.css';
import useProfileSettings from '../../hooks/useProfileSettings';
import InterestsCard from './InterestsCard';
import {
  getTop10Leaderboard,
  getUserRank,
  LeaderboardUser,
} from '../../services/leaderboardService';

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

  // Fetch the leaderboard once loading is finished,
  // and fetch user rank only if userData is available.
  useEffect(() => {
    if (!loading) {
      const fetchData = async () => {
        try {
          const top10 = await getTop10Leaderboard();

          // Sort by points descending, just in case the backend isn't sorted
          const sorted = [...top10].sort((a, b) => b.points - a.points);
          setLeaderboard(sorted);

          // If we have a user, also fetch their rank
          if (userData?.username) {
            const rank = await getUserRank(userData.username);
            setUserRank(rank);
          }
        } catch (err) {
          console.error('Error fetching leaderboard:', err);
        }
      };

      fetchData();
    }
  }, [loading, userData]);

  if (loading) {
    return (
      <div className='page-container'>
        <div className='profile-card'>
          <h2>Loading user data...</h2>
        </div>
      </div>
    );
  }

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
                <span
                  className='leaderboard-username'
                  style={{ fontWeight: 'normal' }} // override bold if needed
                >
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
