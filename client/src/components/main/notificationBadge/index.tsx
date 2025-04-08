import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import useUserContext from '../../../hooks/useUserContext';
import { BadgeNotificationPayload } from '../../../types/types.js';

/**
 * Component that listens for badge notifications and displays them as toasts.
 * This component doesn't render anything visible.
 */
const BadgeNotificationHandler: React.FC = () => {
  const { user, socket } = useUserContext();

  useEffect(() => {
    if (!user || !socket) return undefined;

    /**
     * Handler function for badge notifications
     */
    const handleBadgeNotification = (notification: BadgeNotificationPayload) => {
      // Only show notifications for the current user
      if (notification.username === user.username) {
        const toastOptions = {
          position: 'top-right' as const,
          autoClose: notification.type === 'awarded' ? 5000 : 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        };

        if (notification.type === 'awarded') {
          toast.success(
            <div>
              <span role='img' aria-label='trophy'>
                🏆
              </span>{' '}
              {notification.message}
            </div>,
            toastOptions,
          );
        } else {
          toast.info(
            <div>
              <span role='img' aria-label='progress'>
                🔄
              </span>{' '}
              {notification.message}
            </div>,
            toastOptions,
          );
        }
      }
    };

    // Register event listener
    socket.on('badgeNotification', handleBadgeNotification);

    // Clean up listener on unmount
    return () => {
      socket.off('badgeNotification', handleBadgeNotification);
    };
  }, [user, socket]);

  // This component doesn't render anything
  return null;
};

export default BadgeNotificationHandler;
