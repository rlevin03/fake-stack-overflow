// server/socketHandlers.ts
import { Server } from 'socket.io';
import { getGeminiAutoComplete } from './services/gemini.service';
import { updateUser } from './services/user.service';
import { getTop10ByPoints } from './services/user.service';

interface AutocompleteData {
  field: string;
  text: string;
}

interface RankingVisibilityData {
  username: string;
  hideRanking: boolean;
}

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Listen for autocomplete requests.
    socket.on('aiAutoComplete', async (data: AutocompleteData) => {
      try {
        const { field, text } = data;
        const prompt = `Complete the following ${field === 'answer' ? 'answer' : field} in plain text (no bullet points or markdown), in under 50 words:\n${text}`;
        const suggestion = await getGeminiAutoComplete(prompt);
        if (field === 'title') {
          socket.emit('aiAutoCompleteResponse', suggestion);
        } else if (field === 'text') {
          socket.emit('aiAutoCompleteResponseText', suggestion);
        } else if (field === 'answer') {
          socket.emit('aiAutoCompleteResponseAnswer', suggestion);
        }
      } catch (err) {
        console.error('Error in aiAutoComplete:', err);
        if (data.field === 'title') {
          socket.emit('aiAutoCompleteResponse', '');
        } else if (data.field === 'text') {
          socket.emit('aiAutoCompleteResponseText', '');
        } else if (data.field === 'answer') {
          socket.emit('aiAutoCompleteResponseAnswer', '');
        }
      }
    });

    // NEW: Listen for ranking visibility update.
    socket.on('updateRankingVisibility', async (data: RankingVisibilityData) => {
      try {
        const { username, hideRanking } = data;
        // Update the user's hideRanking field using your updateUser function.
        const updatedUser = await updateUser(username, { hideRanking });
        if ('error' in updatedUser) {
          throw new Error(updatedUser.error);
        }
        // Optionally, send an update back to the client that made the change.
        socket.emit('userUpdate', { user: updatedUser, type: 'updated' });
        // Recompute the public leaderboard (which filters out users with hideRanking = true)
        const top10 = await getTop10ByPoints();
        io.emit('top10Response', top10);
      } catch (error) {
        console.error('Error updating ranking visibility:', error);
        socket.emit('error', { message: 'Error updating ranking visibility' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
