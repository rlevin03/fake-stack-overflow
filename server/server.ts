// // Run this script to launch the server.

import {server, app, startServer} from './app'
import { Server } from 'socket.io';
import { getGeminiAutoComplete } from './services/gemini.service';

const io = new Server(server, {
    cors: {
      origin: "*", // adjust as needed
      methods: ["GET", "POST"],
    },
  });
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
  
    // Expect an object with a "field" and "text"
    socket.on('aiAutoComplete', async (data: { field: string; text: string }) => {
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
  
    // ... other event handlers ...
  });
  
startServer();
export {app, server};


