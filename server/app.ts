import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import * as http from 'http';

import './decayJob';
import answerController from './controllers/answer.controller';
import questionController from './controllers/question.controller';
import tagController from './controllers/tag.controller';
import commentController from './controllers/comment.controller';
import { FakeSOSocket } from './types/types';
import userController from './controllers/user.controller';
import messageController from './controllers/message.controller';
import chatController from './controllers/chat.controller';
import gameController from './controllers/game.controller';
import leaderboardController from './controllers/leaderboard.controller';
import sessionController from './controllers/session.controller';
import badgeController from './controllers/badge.controller';
import registerCollabHandlers from './controllers/collab.controller';
import { registerSocketHandlers } from './socketHandlers';

dotenv.config();

const MONGO_URL = `${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'}/fake_so`;
const CLIENT_URL = process.env.CLIENT_URL || 'cs4530-s25-605-api.onrender.com';
const port = parseInt(process.env.PORT || '8000');

const app = express();
const server = http.createServer(app);
const socket: FakeSOSocket = new Server(server, {
  cors: { origin: '*' },
});

// Call registerCollabHandlers to set up collaboration events
registerCollabHandlers(socket);

// Register our autocomplete (and any other) socket event handlers.
registerSocketHandlers(socket);

function connectDatabase() {
  return mongoose.connect(MONGO_URL).catch(err => console.log('MongoDB connection error:', err));
}

function startServer() {
  connectDatabase();
  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

socket.on('connection', clientSocket => {
  console.log('A user connected ->', clientSocket.id);

  clientSocket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  socket.close();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

app.use(
  cors({
    credentials: true,
    origin: [CLIENT_URL],
  }),
);

app.use(express.json());

app.get('/', (_: Request, res: Response) => {
  res.send('hello world');
  res.end();
});

app.use('/question', questionController(socket));
app.use('/tag', tagController());
app.use('/answer', answerController(socket));
app.use('/comment', commentController(socket));
app.use('/messaging', messageController(socket));
app.use('/user', userController(socket));
app.use('/chat', chatController(socket));
app.use('/games', gameController(socket));
app.use('/leaderboard', leaderboardController(socket));
app.use('/sessions', sessionController(socket));
app.use('/badge', badgeController());

export { app, server, startServer };
