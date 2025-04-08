import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSession from '../../../hooks/useSession';
import { DatabaseSession } from '../../../types/types';
import './index.css';

const CollaborativeSession: React.FC = () => {
  const navigate = useNavigate();
  const [joinSessionId, setJoinSessionId] = useState<string>('');
  const { userSessions, loading, error, createSession } = useSession();

  /**
   * Handles creating a new session and navigating to its page.
   */
  const handleCreateSession = async (): Promise<void> => {
    try {
      const newSession: DatabaseSession = await createSession();
      navigate(`/sessions/${newSession._id.toString()}`);
    } catch (err) {
      /* empty */
    }
  };

  /**
   * Handles joining an existing session.
   */
  const handleJoinSession = (): void => {
    const trimmedId = joinSessionId.trim();
    if (trimmedId !== '') {
      navigate(`/sessions/${trimmedId}`);
    }
  };

  /**
   * Renders the section for displaying sessions.
   */
  const renderSessionSection = () => {
    if (loading) {
      return <p>Loading sessions...</p>;
    }
    if (error) {
      return <p className='error'>{error}</p>;
    }
    if (userSessions.length === 0) {
      return <p>No sessions found.</p>;
    }
    return (
      <ul>
        {userSessions.map((session: DatabaseSession) => (
          <li key={session._id.toString()}>
            <span>Session ID: {session._id.toString()}</span>
            <button onClick={() => navigate(`/sessions/${session._id.toString()}`)}>
              Open Session
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className='collab-session-container'>
      <h1>Collaborative Coding Sessions</h1>
      <section className='session-actions'>
        <div className='create-session'>
          <h2>Create a New Session</h2>
          <button onClick={handleCreateSession} disabled={loading}>
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </div>
        <div className='join-session'>
          <h2>Join an Existing Session</h2>
          <input
            type='text'
            value={joinSessionId}
            onChange={e => setJoinSessionId(e.target.value)}
            placeholder='Enter Session ID'
          />
          <button onClick={handleJoinSession} disabled={joinSessionId.trim() === ''}>
            Join Session
          </button>
        </div>
      </section>
      <section className='previous-sessions'>
        <h2>Your Previous Sessions</h2>
        {renderSessionSection()}
      </section>
    </div>
  );
};

export default CollaborativeSession;
