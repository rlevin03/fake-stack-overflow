import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Badge } from '../../../../types/types';
import { getBadges } from '../../../../services/badgeService';
import './index.css';

interface BadgeComponentProps {
  badgeIds: string[];
}

const badgeIcons: Record<string, string> = {
  'Curious Cat': '🐱',
  'Helping Hand': '🤝',
  'Lifeline': '🆘',
  'Lightning Responder': '⚡',
  'Respected Voice': '🎤',
  'Peoples Champion': '👑',
  'Pair Programmer': '👥',
  'The Historian': '📜',
};

const BadgeComponent: React.FC<BadgeComponentProps> = ({ badgeIds }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        console.log('Fetching badges for IDs:', badgeIds);
        const fetchedBadges = await getBadges(badgeIds);
        console.log('Fetched badges:', fetchedBadges);
        setBadges(fetchedBadges);
      } catch (error) {
        console.error('Error fetching badges:', error);
        setError(`Error fetching badges: ${error}`);
      }
    };

    if (badgeIds && badgeIds.length > 0) {
      fetchBadges();
    }
  }, [badgeIds]);

  // Filter only attained badges
  const attainedBadges = badges.filter(badge => badge.attained);

  if (error) {
    return <div className='error-message'>Error loading badges: {error}</div>;
  }

  if (badges.length === 0) {
    return <div className='no-badges-message'>No badges to display</div>;
  }

  return (
    <div className='badge-container'>
      {attainedBadges.map((badge, index) => (
        <div key={index} className='badge-item'>
          <div className='badge-content'>
            <div className='badge-icon'>
              <span className='badge-icon-text'>{badgeIcons[badge.name]}</span>
            </div>
            <span className='badge-name'>{badge.name}</span>
          </div>

          <div className='badge-tooltip'>
            <div className='tooltip-content'>
              <div className='tooltip-title'>{badge.name}</div>
              <div className='tooltip-description'>{badge.description}</div>
            </div>
            <div className='tooltip-arrow'></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BadgeComponent;
