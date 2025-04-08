import { downvoteQuestion, upvoteQuestion } from '../../../services/questionService';
import { downvoteAnswer, upvoteAnswer } from '../../../services/answerService';
import './index.css';
import useUserContext from '../../../hooks/useUserContext';
import { PopulatedDatabaseQuestion, PopulatedDatabaseAnswer } from '../../../types/types';
import useVoteStatus from '../../../hooks/useVoteStatus';

/**
 * Interface represents the props for the VoteComponent.
 *
 * item - The question or answer object containing voting information.
 * type - The type of item being voted on ('question' or 'answer')
 */
interface VoteComponentProps {
  item: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
  type: 'question' | 'answer';
}

/**
 * A Vote component that allows users to upvote or downvote a question or answer.
 *
 * @param item - The question or answer object containing voting information.
 * @param type - The type of item being voted on ('question' or 'answer')
 */
const VoteComponent = ({ item, type }: VoteComponentProps) => {
  const { user } = useUserContext();
  const { count, voted } = useVoteStatus({ item, type });

  /**
   * Function to handle upvoting or downvoting an item.
   *
   * @param voteType - The type of vote, either 'upvote' or 'downvote'.
   */
  const handleVote = async (voteType: string) => {
    try {
      if (item._id) {
        if (type === 'question') {
          if (voteType === 'upvote') {
            await upvoteQuestion(item._id, user.username);
          } else if (voteType === 'downvote') {
            await downvoteQuestion(item._id, user.username);
          }
        } else if (voteType === 'upvote') {
          await upvoteAnswer(item._id, user.username);
        } else if (voteType === 'downvote') {
          await downvoteAnswer(item._id, user.username);
        }
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className='vote-container'>
      <button
        className={`vote-button ${voted === 1 ? 'vote-button-upvoted' : ''}`}
        onClick={() => handleVote('upvote')}>
        Upvote
      </button>
      <button
        className={`vote-button ${voted === -1 ? 'vote-button-downvoted' : ''}`}
        onClick={() => handleVote('downvote')}>
        Downvote
      </button>
      <span className='vote-count'>{count}</span>
    </div>
  );
};

export default VoteComponent;
