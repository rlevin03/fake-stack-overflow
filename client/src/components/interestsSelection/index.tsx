import React from 'react';
import { useNavigate } from 'react-router-dom';
import tagIndexMap from '@fake-stack-overflow/shared/tagIndexMap.json';
import { updatePreferences } from '../../services/userService';
import useUserContext from '../../hooks/useUserContext';
import TagSelector from '../common/TagSelector';
import './index.css';

const InterestsSelection = () => {
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const { user, setUser } = useUserContext();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!user) {
      console.error('No user found in context');
      return;
    }

    // Prepare updates: for each selected tag, use the predefined index and update with a value (here, +1)
    const updates = selectedTags
      .map(tagName => {
        const index = (tagIndexMap as Record<string, number>)[tagName];
        return index !== undefined ? { index, value: 1 } : null;
      })
      .filter((update): update is { index: number; value: number } => update !== null);

    try {
      const updatedUser = await updatePreferences(user._id.toString(), updates);
      setUser(updatedUser);
      navigate('/home');
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  return (
    <div className='interests-container'>
      <h2>Select Your Interests</h2>
      <TagSelector selectedTags={selectedTags} setSelectedTags={setSelectedTags} />
      <button className='submit-interests-button' onClick={handleSubmit}>
        Save Interests
      </button>
    </div>
  );
};

export default InterestsSelection;
