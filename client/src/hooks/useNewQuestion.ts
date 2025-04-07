import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { validateHyperlink } from '../tool';
import { addQuestion } from '../services/questionService';
import useUserContext from './useUserContext';
import { Question } from '../types/types';

/**
 * Custom hook to handle question submission and form validation
 *
 * @returns title - The current value of the title input.
 * @returns text - The current value of the text input.
 * @returns tagNames - The current array of selected tag names.
 * @returns titleErr - Error message for the title field, if any.
 * @returns textErr - Error message for the text field, if any.
 * @returns tagErr - Error message for the tag field, if any.
 * @returns postQuestion - Function to validate the form and submit a new question.
 */
const useNewQuestion = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  // Initialize tagNames as an array of strings
  const [tagNames, setTagNames] = useState<string[]>([]);

  const [titleErr, setTitleErr] = useState<string>('');
  const [textErr, setTextErr] = useState<string>('');
  const [tagErr, setTagErr] = useState<string>('');

  // Autocomplete suggestion states for title and text
  const [titleSuggestion, setTitleSuggestion] = useState<string>('');
  const [textSuggestion, setTextSuggestion] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const titleDebounce = useRef<NodeJS.Timeout | null>(null);
  const textDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:8000');
    const socket = socketRef.current;
    socket.on('aiAutoCompleteResponse', (suggestion: string) => {
      setTitleSuggestion(suggestion);
    });
    socket.on('aiAutoCompleteResponseText', (suggestion: string) => {
      setTextSuggestion(suggestion);
    });
    return () => {
      socket.off('aiAutoCompleteResponse');
      socket.off('aiAutoCompleteResponseText');
      socket.disconnect();
    };
  }, []);

  // Debounce for title field
  useEffect(() => {
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    if (title.trim() === '') {
      setTitleSuggestion('');
      return;
    }
    titleDebounce.current = setTimeout(() => {
      socketRef.current?.emit('aiAutoComplete', { field: 'title', text: title });
    }, 4000);
    // eslint-disable-next-line consistent-return
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, [title]);

  // Debounce for text field
  useEffect(() => {
    if (textDebounce.current) clearTimeout(textDebounce.current);
    if (text.trim() === '') {
      setTextSuggestion('');
      return;
    }
    textDebounce.current = setTimeout(() => {
      socketRef.current?.emit('aiAutoComplete', { field: 'text', text });
    }, 4000);
    // eslint-disable-next-line consistent-return
    return () => {
      if (textDebounce.current) clearTimeout(textDebounce.current);
    };
  }, [text]);

  // KeyDown for title: if Tab is pressed, accept suggestion
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Tab' && titleSuggestion) {
      e.preventDefault();
      setTitle(prev => prev + titleSuggestion);
      setTitleSuggestion('');
    }
  };

  // KeyDown for text: if Tab is pressed, accept suggestion
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab' && textSuggestion) {
      e.preventDefault();
      setText(prev => prev + textSuggestion);
      setTextSuggestion('');
    }
  };

  /**
   * Validates the form before submitting the question.
   *
   * @returns boolean - True if the form is valid, false otherwise.
   */
  const validateForm = (): boolean => {
    let isValid = true;

    if (!title) {
      setTitleErr('Title cannot be empty');
      isValid = false;
    } else if (title.length > 100) {
      setTitleErr('Title cannot be more than 100 characters');
      isValid = false;
    } else {
      setTitleErr('');
    }

    if (!text) {
      setTextErr('Question text cannot be empty');
      isValid = false;
    } else if (!validateHyperlink(text)) {
      setTextErr('Invalid hyperlink format.');
      isValid = false;
    } else {
      setTextErr('');
    }

    if (tagNames.length === 0) {
      setTagErr('Should have at least 1 tag');
      isValid = false;
    } else if (tagNames.length > 5) {
      setTagErr('Cannot have more than 5 tags');
      isValid = false;
    } else {
      setTagErr('');
    }

    return isValid;
  };

  /**
   * Function to post a question to the server.
   */
  const postQuestion = async () => {
    if (!validateForm()) return;

    // Map the array of tag names to tag objects.
    const tags = tagNames.map(tagName => ({
      name: tagName,
      description: 'user added tag',
    }));

    const question: Question = {
      title,
      text,
      tags,
      askedBy: user.username,
      askDateTime: new Date(),
      answers: [],
      upVotes: [],
      downVotes: [],
      views: [],
      comments: [],
    };

    const res = await addQuestion(question);

    if (res && res._id) {
      navigate('/home');
    }
  };

  return {
    title,
    setTitle,
    text,
    setText,
    tagNames,
    setTagNames,
    titleErr,
    textErr,
    tagErr,
    postQuestion,
    titleSuggestion,
    textSuggestion,
    handleTitleKeyDown,
    handleTextKeyDown,
  };
};

export default useNewQuestion;
