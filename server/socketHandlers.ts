// server/socketHandlers.ts
import { Server } from 'socket.io';
import { getGeminiAutoComplete } from './services/gemini.service';

interface AutocompleteData {
  field: string;
  text: string;
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

    // You can register other socket events here as needed.

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
