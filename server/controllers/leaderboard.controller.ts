// server/src/controllers/leaderboard.controller.ts
import express, { Request, Response } from 'express';
import { FakeSOSocket } from '../types/types';
import { getTop10ByPoints, getRankForUser } from '../services/user.service';

const leaderboardController = (socket: FakeSOSocket) => {
  const router = express.Router();

  // REST endpoint for top 10 leaderboard
  router.get('/top10', async (req: Request, res: Response) => {
    try {
      const top10 = await getTop10ByPoints();
      if ('error' in top10) throw new Error(top10.error);
      res.status(200).json(top10);
    } catch (error: any) {
      res.status(500).send(`Error when getting top 10: ${error.message}`);
    }
  });

  // REST endpoint for user rank (expects ?username=... as query parameter)
  router.get('/user-rank', async (req: Request, res: Response) => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== 'string') {
        res.status(400).send('Invalid or missing username query parameter');
        return;
      }
      const rankResult = await getRankForUser(username);
      if ('error' in rankResult) throw new Error(rankResult.error);
      res.status(200).json(rankResult);
    } catch (error: any) {
      res.status(500).send(`Error when getting user rank: ${error.message}`);
    }
  });

  // WebSocket event handlers for leaderboard
  socket.on('connection', (conn) => {
    console.log('Leaderboard WS connection:', conn.id);

    // Handle request for top 10 leaderboard via WebSocket
    conn.on('getTop10', async () => {
      try {
        const top10 = await getTop10ByPoints();
        if ('error' in top10) throw new Error(top10.error);
        conn.emit('top10Response', top10);
      } catch (error: any) {
        conn.emit('error', `Error when getting top 10: ${error.message}`);
      }
    });

    // Handle request for user rank via WebSocket
    conn.on('getUserRank', async (data: { username: string }) => {
      try {
        if (!data.username) {
          conn.emit('error', 'Missing username');
          return;
        }
        const rankResult = await getRankForUser(data.username);
        if ('error' in rankResult) throw new Error(rankResult.error);
        conn.emit('userRankResponse', rankResult);
      } catch (error: any) {
        conn.emit('error', `Error when getting user rank: ${error.message}`);
      }
    });
  });

  return router;
};

export default leaderboardController;
