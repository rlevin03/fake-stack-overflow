import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './layout';
import Login from './auth/login';
import { FakeSOSocket, SafeDatabaseUser } from '../types/types';
import LoginContext from '../contexts/LoginContext';
import UserContext from '../contexts/UserContext';
import QuestionPage from './main/questionPage';
import TagPage from './main/tagPage';
import NewQuestionPage from './main/newQuestion';
import NewAnswerPage from './main/newAnswer';
import AnswerPage from './main/answerPage';
import MessagingPage from './main/messagingPage';
import DirectMessage from './main/directMessage';
import Signup from './auth/signup';
import UsersListPage from './main/usersListPage';
import ProfileSettings from './profileSettings';
import AllGamesPage from './main/games/allGamesPage';
import GamePage from './main/games/gamePage';
import InterestsSelection from './interestsSelection';
import SessionsPage from './main/sessionsPage';
import CollaborativeEditor from './main/collabEditor';
import LeaderboardPage from './main/leaderboardPage';
import BadgeNotificationHandler from './main/notificationBadge';

const ProtectedRoute = ({
  user,
  socket,
  setUser,
  children,
}: {
  user: SafeDatabaseUser | null;
  socket: FakeSOSocket | null;
  setUser: (user: SafeDatabaseUser | null) => void;
  children: JSX.Element;
}) => {
  if (!user || !socket) {
    return <Navigate to='/' />;
  }
  return <UserContext.Provider value={{ user, socket, setUser }}>{children}</UserContext.Provider>;
};

const FakeStackOverflow = ({ socket }: { socket: FakeSOSocket | null }) => {
  const [user, setUser] = useState<SafeDatabaseUser | null>(null);

  return (
    <LoginContext.Provider value={{ setUser }}>
      <ToastContainer />
      {user && socket && (
        <UserContext.Provider value={{ user, socket, setUser }}>
          <BadgeNotificationHandler />
        </UserContext.Provider>
      )}
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Login />} />
        <Route path='/signup' element={<Signup />} />

        {/* Protected Routes */}
        {
          <Route
            element={
              <ProtectedRoute user={user} socket={socket} setUser={setUser}>
                <Layout />
              </ProtectedRoute>
            }>
            <Route path='/home' element={<QuestionPage />} />
            <Route path='tags' element={<TagPage />} />
            <Route path='/messaging' element={<MessagingPage />} />
            <Route path='/messaging/direct-message' element={<DirectMessage />} />
            <Route path='/question/:qid' element={<AnswerPage />} />
            <Route path='/new/question' element={<NewQuestionPage />} />
            <Route path='/new/answer/:qid' element={<NewAnswerPage />} />
            <Route path='/users' element={<UsersListPage />} />
            <Route path='/user/:username' element={<ProfileSettings />} />
            <Route path='/games' element={<AllGamesPage />} />
            <Route path='/games/:gameID' element={<GamePage />} />
            <Route path='/select-interests' element={<InterestsSelection />} />
            <Route path='/:username/sessions' element={<SessionsPage />} />
            <Route path='/sessions/:codingSessionID' element={<CollaborativeEditor />} />
            <Route path='/leaderboard' element={<LeaderboardPage />} />
          </Route>
        }
      </Routes>
    </LoginContext.Provider>
  );
};

export default FakeStackOverflow;
