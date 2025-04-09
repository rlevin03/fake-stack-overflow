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
};

/**
 * Calls the Gemini API to provide an autocomplete suggestion.
 *
 * The prompt is built based on the field type:
 * - For "title": complete the question title.
 * - For "text": complete the question description.
 * - For "answer": complete the answer text.
 *
 * @param field - One of "title", "text", or "answer".
 * @param partialText - The current partial text that the user has typed.
 * @returns A promise that resolves with the suggested continuation.
 */
const getGeminiAutoComplete = async (field: string, partialText: string): Promise<string> => {
  let prompt = '';
  if (field === 'title') {
    prompt = `
Complete the following question title in plain text (no bullet points or markdown). 
The final suggestion must be under 50 characters and must not repeat any portion of the already-typed text. 
This question is about computer science. 
You are helping the user finish writing their question title. 
Reply with only the additional words needed to complete the title:
${partialText}`.trim();
  } else if (field === 'text') {
    prompt = `
Complete the following question description in plain text (no bullet points or markdown). 
The final suggestion must be under 50 characters and must not repeat any portion of the already-typed text. 
This question is about computer science. 
You are helping the user finish writing their question description. 
Reply with only the additional words needed to complete the description:
${partialText}`.trim();
  } else if (field === 'answer') {
    prompt = `
Complete the following answer in plain text (no bullet points or markdown). 
The final suggestion must be under 50 characters and must not repeat any portion of the already-typed text. 
This question is about computer science. 
You are helping the user finish writing their answer. 
Reply with only the additional words needed to complete the answer:
${partialText}`.trim();
  } else {
    prompt = `
Complete the following text in plain text (no bullet points or markdown). 
The final suggestion must be under 50 characters and must not repeat any portion of the already-typed text. 
You are helping the user finalize their text. 
Reply with only the additional words needed to complete it:
${partialText}`.trim();
  }

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

  // Extract the autocomplete suggestion from the API response.
  const suggestion = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return suggestion;
};

export { getGeminiResponse, getGeminiAutoComplete };
