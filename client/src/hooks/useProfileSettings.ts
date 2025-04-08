// client/src/hooks/useProfileSettings.ts
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getUserByUsername,
  deleteUser,
  resetPassword,
  updateBiography,
  updateAIToggler,
} from '../services/userService';
import { SafeDatabaseUser } from '../types/types';
import useUserContext from './useUserContext';

const useProfileSettings = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, socket } = useUserContext();

  // Local state
  const [userData, setUserData] = useState<SafeDatabaseUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editBioMode, setEditBioMode] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [aiToggler, setAiToggler] = useState<boolean>(true);
  const [hideRanking, setHideRanking] = useState<boolean>(false);

  const canEditProfile =
    currentUser.username && userData?.username ? currentUser.username === userData.username : false;

  useEffect(() => {
    if (!username) return;
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await getUserByUsername(username);
        setUserData(data);
      } catch (error) {
        setErrorMessage('Error fetching user profile');
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [username]);

  // Update aiToggler and hideRanking state when userData changes.
  useEffect(() => {
    if (userData) {
      if (typeof userData.aiToggler === 'boolean') {
        setAiToggler(userData.aiToggler);
      }
      if (typeof userData.hideRanking === 'boolean') {
        setHideRanking(userData.hideRanking);
      }
    }
  }, [userData]);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const validatePasswords = () => {
    if (newPassword.trim() === '' || confirmNewPassword.trim() === '') {
      setErrorMessage('Please enter and confirm your new password.');
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!username) return;
    if (!validatePasswords()) return;
    try {
      await resetPassword(username, newPassword);
      setSuccessMessage('Password reset successful!');
      setErrorMessage(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setErrorMessage('Failed to reset password.');
      setSuccessMessage(null);
    }
  };

  const handleUpdateBiography = async () => {
    if (!username) return;
    try {
      const updatedUser = await updateBiography(username, newBio);
      setUserData(updatedUser);
      setEditBioMode(false);
      setSuccessMessage('Biography updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update biography.');
      setSuccessMessage(null);
    }
  };

  const handleToggleAIToggler = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAiToggler(newValue);
    if (!username) return;
    try {
      const updatedUser = await updateAIToggler(username, newValue);
      setUserData(updatedUser);
      setSuccessMessage('AI setting updated!');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Failed to update AI setting.');
      setSuccessMessage(null);
    }
  };

  // NEW: Handler for toggling ranking visibility via socket.
  const handleToggleRankingVisibility = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setHideRanking(newValue);
    if (!username || !socket) return;
    socket.emit('updateRankingVisibility', { username, hideRanking: newValue });
  };

  const handleDeleteUser = () => {
    if (!username) return;
    setShowConfirmation(true);
    setPendingAction(() => async () => {
      try {
        await deleteUser(username);
        setSuccessMessage(`User "${username}" deleted successfully.`);
        setErrorMessage(null);
        navigate('/');
      } catch (error) {
        setErrorMessage('Failed to delete user.');
        setSuccessMessage(null);
      } finally {
        setShowConfirmation(false);
      }
    });
  };

  return {
    userData,
    newPassword,
    confirmNewPassword,
    setNewPassword,
    setConfirmNewPassword,
    loading,
    editBioMode,
    setEditBioMode,
    newBio,
    setNewBio,
    successMessage,
    errorMessage,
    showConfirmation,
    setShowConfirmation,
    pendingAction,
    setPendingAction,
    canEditProfile,
    showPassword,
    togglePasswordVisibility,
    handleResetPassword,
    handleUpdateBiography,
    handleDeleteUser,
    aiToggler,
    handleToggleAIToggler,
    hideRanking,
    handleToggleRankingVisibility,
  };
};

export default useProfileSettings;
