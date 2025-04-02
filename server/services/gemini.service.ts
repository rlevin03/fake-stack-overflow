// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Calls the Gemini API to generate an AI answer based on the provided prompt.
 *
 * @param prompt - The text prompt (for example, question title and text).
 * @returns A promise that resolves with the generated answer text.
 */
const getGeminiResponse = async (prompt: string): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `Q: ${prompt}\nA:` }],
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Adjust the extraction logic based on the actual API response structure.
    const answerText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini API';
    return answerText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

export default getGeminiResponse;
