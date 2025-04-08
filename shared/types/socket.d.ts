// server/types/types.d.ts

import { PopulatedDatabaseAnswer } from './answer';
import { PopulatedDatabaseChat } from './chat';
import { DatabaseMessage } from './message';
import { PopulatedDatabaseQuestion } from './question';
import { SafeDatabaseUser } from './user';
import { BaseMove, GameInstance, GameInstanceID, GameMove, GameState } from './game';
import { Badge } from './badge';

export interface AnswerUpdatePayload {
  qid: ObjectId;
  answer: PopulatedDatabaseAnswer;
}

export interface GameUpdatePayload {
  gameInstance: GameInstance<GameState>;
}

export interface GameErrorPayload {
  player: string;
  error: string;
}

export interface VoteUpdatePayload {
  qid: string;
  upVotes: string[];
  downVotes: string[];
}

export interface ChatUpdatePayload {
  chat: PopulatedDatabaseChat;
  type: 'created' | 'newMessage' | 'newParticipant';
}

export interface CommentUpdatePayload {
  result: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
  type: 'question' | 'answer';
}

export interface MessageUpdatePayload {
  msg: DatabaseMessage;
}

export interface UserUpdatePayload {
  user: SafeDatabaseUser;
  type: 'created' | 'deleted' | 'updated';
}

export interface GameMovePayload {
  gameID: GameInstanceID;
  move: GameMove<BaseMove>;
}

export interface SessionUpdatePayload {
  session: {
    _id: ObjectId;
    versions: string[];
    createdBy?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };
  type: 'created' | 'updated';
}

// Extend your existing events by adding collaborative events:

export interface ClientToServerEvents {
  makeMove: (move: GameMovePayload) => void;
  joinGame: (gameID: string) => void;
  leaveGame: (gameID: string) => void;
  joinChat: (chatID: string) => void;
  leaveChat: (chatID: string | undefined) => void;
  getTop10: () => void;
  getUserRank: (data: { username: string }) => void;

  // -- Collaborative Editor events --
  joinSession: (sessionId: string, username: string) => void;
  codeChange: (data: { codingSessionID: string; code: string; username: string }) => void;
  executeCode: (data: { codingSessionID: string; code: string; username: string }) => void;
  leaveSession: (sessionId: string, username: string) => void;
  cursorChange: (data: {
    codingSessionID: string;
    cursorPosition: { lineNumber: number; column: number };
    username: string;
  }) => void;
  editHighlight: (data: {
    codingSessionID: string;
    lineNumber: number;
    editorId: string;
    timestamp: number;
  }) => void;
  editorError: (data: { codingSessionID: string; errorMessage: string }) => void;
}

export interface ServerToClientEvents {
  questionUpdate: (question: PopulatedDatabaseQuestion) => void;
  answerUpdate: (result: AnswerUpdatePayload) => void;
  viewsUpdate: (question: PopulatedDatabaseQuestion) => void;
  voteUpdate: (vote: VoteUpdatePayload) => void;
  commentUpdate: (comment: CommentUpdatePayload) => void;
  messageUpdate: (message: MessageUpdatePayload) => void;
  userUpdate: (user: UserUpdatePayload) => void;
  gameUpdate: (game: GameUpdatePayload) => void;
  gameError: (error: GameErrorPayload) => void;
  chatUpdate: (chat: ChatUpdatePayload) => void;
  sessionUpdate: (payload: SessionUpdatePayload) => void;
  badgeNotification: (notification: BadgeNotificationPayload) => void;

  // --- NEW EVENTS FOR LEADERBOARD ---
  userRankResponse: (payload: { rank: number }) => void;
  top10Response: (payload: { username: string; points: number }[]) => void;
  badgesResponse: (badges: Badge[]) => void;
  error: (msg: string) => void;

  // -- Collaborative Editor events --
  userJoined: (username: string) => void;
  codeUpdate: (code: string) => void;
  executionResult: (result: string) => void;
  userLeft: (username: string) => void;
  cursorChanged: (data: {
    username: string;
    cursorPosition: {
      lineNumber: number;
      column: number;
    };
  }) => void;
  editHighlight: (data: { lineNumber: number; editorId: string; timestamp: number }) => void;
  editorError: (errorMessage: string) => void;
}
