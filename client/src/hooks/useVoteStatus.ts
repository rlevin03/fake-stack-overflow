import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { PopulatedDatabaseQuestion, PopulatedDatabaseAnswer } from '../types/types';

/**
 * Custom hook to handle voting logic for a question or answer.
 * It manages the current vote count, user vote status (upvoted, downvoted),
 * and handles real-time vote updates via socket events.
 *
 * @param item - The question or answer object for which the voting is tracked.
 * @param type - The type of item being voted on ('question' or 'answer')
 *
 * @returns count - The current vote count (upVotes - downVotes)
 * @returns setCount - The function to manually update vote count
 * @returns voted - The user's vote status
 * @returns setVoted - The function to manually update user's vote status
 */
const useVoteStatus = ({
  item,
  type,
}: {
  item: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
  type: 'question' | 'answer';
}) => {
  const { user, socket } = useUserContext();
  const [count, setCount] = useState<number>(0);
  const [voted, setVoted] = useState<number>(0);

  useEffect(() => {
    /**
     * Function to get the current vote value for the user.
     *
     * @returns The current vote value for the user in the item, 1 for upvote, -1 for downvote, 0 for no vote.
     */
    const getVoteValue = () => {
      if (user.username && item?.upVotes?.includes(user.username)) {
        return 1;
      }
      if (user.username && item?.downVotes?.includes(user.username)) {
        return -1;
      }
      return 0;
    };

    // Set the initial count and vote value
    setCount((item.upVotes || []).length - (item.downVotes || []).length);
    setVoted(getVoteValue());
  }, [item, user.username, socket]);

  return {
    count,
    setCount,
    voted,
    setVoted,
  };
};

export default useVoteStatus;
