import React, { useEffect, useState } from 'react';
import tagIndexMap from '@fake-stack-overflow/shared/tagIndexMap.json';
import TagSelector from '../common/TagSelector';
import { updatePreferences } from '../../services/userService';
import useUserContext from '../../hooks/useUserContext';
import './InterestsCard.css';

const InterestsCard: React.FC = () => {
  const { user, setUser } = useUserContext();
  const [profileSelectedTags, setProfileSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  // On mount, initialize selected tags based on the user's preferences vector.
  useEffect(() => {
    if (user) {
      const selected: string[] = [];
      Object.entries(tagIndexMap).forEach(([tagName, index]) => {
        if (user.preferences[index] > 0) {
          selected.push(tagName);
        }
      });
      setProfileSelectedTags(selected);
    }
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user) return;

    // Derive the current selection from user.preferences.
    const oldSelected: string[] = [];
    Object.entries(tagIndexMap).forEach(([tagName, index]) => {
      if (user.preferences[index] > 0) {
        oldSelected.push(tagName);
      }
    });

    // Determine which tags have been added and which have been removed.
    const toAdd = profileSelectedTags.filter(tag => !oldSelected.includes(tag));
    const toRemove = oldSelected.filter(tag => !profileSelectedTags.includes(tag));

    // Build the update instructions.
    const updates: { index: number; value: number }[] = [];
    toAdd.forEach(tagName => {
      const index = (tagIndexMap as Record<string, number>)[tagName];
      if (index !== undefined) updates.push({ index, value: 1 });
    });
    toRemove.forEach(tagName => {
      const index = (tagIndexMap as Record<string, number>)[tagName];
      if (index !== undefined) updates.push({ index, value: -1 });
    });

    try {
      const updatedUser = await updatePreferences(user._id.toString(), updates);
      setUser(updatedUser);
      setMessage('Interests updated successfully.');
    } catch (err) {
      setMessage('Error updating interests.');
    }
  };

  return (
    <div className='interests-card'>
      <h4>Interests</h4>
      <TagSelector
        selectedTags={profileSelectedTags}
        setSelectedTags={setProfileSelectedTags}
        inputPlaceholder='Filter interests...'
      />
      <button className='save-interests-button' onClick={handleSavePreferences}>
        Save Interests
      </button>
      {message && <p className='interests-message'>{message}</p>}
    </div>
  );
};

export default InterestsCard;
