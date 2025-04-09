import axios from 'axios';
import { getGeminiResponse, getGeminiAutoComplete } from '../../services/gemini.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Gemini Service', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears cache
    process.env = { ...OLD_ENV, GEMINI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = OLD_ENV; // restore original env
  });

  describe('getGeminiResponse', () => {
    it('should return generated answer from API', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'This is a generated answer.' }],
              },
            },
          ],
        },
      });

      const result = await getGeminiResponse(
        'How to use hooks?',
        'Explain React hooks in short',
        ['react', 'javascript'],
      );

      expect(result).toBe('This is a generated answer.');
    });

    it('should return default fallback if API response is missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const result = await getGeminiResponse('title', 'desc', ['tag']);
      expect(result).toBe('No response from Gemini API');
    });

    it('should throw error if no API key is set', async () => {
      process.env.GEMINI_API_KEY = '';
      await expect(getGeminiResponse('title', 'desc', ['tag'])).rejects.toThrow(
        'Gemini API key not configured',
      );
    });
  });

  describe('getGeminiAutoComplete', () => {
    it('should return autocomplete text from Gemini API', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: '...continued explanation.' }],
              },
            },
          ],
        },
      });

      const result = await getGeminiAutoComplete('React is a JS library');
      expect(result).toBe('...continued explanation.');
    });

    it('should return empty string if suggestion is missing', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const result = await getGeminiAutoComplete('start of answer');
      expect(result).toBe('');
    });

    it('should throw error if no API key is set', async () => {
      process.env.GEMINI_API_KEY = '';
      await expect(getGeminiAutoComplete('start')).rejects.toThrow(
        'Gemini API key not configured',
      );
    });
  });
});
