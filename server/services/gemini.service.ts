// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Calls the Gemini API to generate an AI answer based on the title, description, and tags.
 *
 * @param title       - The question title
 * @param description - The detailed question text
 * @param tags        - Array of tag names
 * @returns A promise that resolves with the generated answer text.
 */
const getGeminiResponse = async (
  title: string,
  description: string,
  tags: string[],
): Promise<string> => {
  try {
    // Build a single string that includes the question title, description, tags, and instructions
    const joinedTags = tags.join(', ');
    const prompt = `
  Title: ${title}
  Description: ${description}
  Tags: ${joinedTags}
  
  INSTRUCTIONS:
  - Provide an answer in plain text only (no bullet points, no markdown).
  - Limit your response to under 50 words.
  
  Answer:
  `.trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Extract the answer text from the API's response
    const answerText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini API';
    return answerText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

/**
 * Calls the Gemini API to provide an autocomplete suggestion.
 * This function takes a single partial text as input.
 *
 * @param partialText - The current answer text the user has typed.
 * @returns A promise that resolves with the suggested continuation.
 */
const getGeminiAutoComplete = async (partialText: string): Promise<string> => {
  try {
    // Build a prompt instructing Gemini to complete the text
    const prompt = `
  Complete the following answer in plain text (no bullet points or markdown), in under 50 words:
  ${partialText}
      `.trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const suggestion = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return suggestion;
  } catch (error) {
    console.error('Error calling Gemini API for autocomplete:', error);
    throw error;
  }
};

export { getGeminiResponse, getGeminiAutoComplete };
