// client/src/hooks/useNewQuestion.ts
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { validateHyperlink } from '../tool';
import { addQuestion } from '../services/questionService';
import useUserContext from './useUserContext';
import { Question } from '../types/types';

const useNewQuestion = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [titleErr, setTitleErr] = useState<string>('');
  const [textErr, setTextErr] = useState<string>('');
  const [tagErr, setTagErr] = useState<string>('');

  // Autocomplete suggestion states for title and text.
  const [titleSuggestion, setTitleSuggestion] = useState<string>('');
  const [textSuggestion, setTextSuggestion] = useState<string>('');

  // Local checkbox state for "Generate AI Answer" on this page.
  // (This is independent of the global AI toggle for autocomplete.)
  const [generateAIAnswer, setGenerateAIAnswer] = useState<boolean>(false);

  // Cooldown states for title and text suggestions.
  const [titleCooldown, setTitleCooldown] = useState<boolean>(false);
  const [textCooldown, setTextCooldown] = useState<boolean>(false);

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

  // Clear suggestions immediately if global AI toggle is disabled.
  useEffect(() => {
    if (!user.aiToggler) {
      setTitleSuggestion('');
      setTextSuggestion('');
    }
  }, [user.aiToggler]);

  // Debounce for title field: only emit if global AI toggle is enabled and not in cooldown.
  useEffect(() => {
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    if (title.trim() === '') {
      setTitleSuggestion('');
      return;
    }
    titleDebounce.current = setTimeout(() => {
      if (user.aiToggler && !titleCooldown) {
        socketRef.current?.emit('aiAutoComplete', { field: 'title', text: title });
      }
    }, 4000);
    // eslint-disable-next-line consistent-return
    return () => {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    };
  }, [title, user.aiToggler, titleCooldown]);

  // Debounce for text field: only emit if global AI toggle is enabled and not in cooldown.
  useEffect(() => {
    if (textDebounce.current) clearTimeout(textDebounce.current);
    if (text.trim() === '') {
      setTextSuggestion('');
      return;
    }
    textDebounce.current = setTimeout(() => {
      if (user.aiToggler && !textCooldown) {
        socketRef.current?.emit('aiAutoComplete', { field: 'text', text });
      }
    }, 4000);
    // eslint-disable-next-line consistent-return
    return () => {
      if (textDebounce.current) clearTimeout(textDebounce.current);
    };
  }, [text, user.aiToggler, textCooldown]);

  // KeyDown for title: if Tab is pressed and a suggestion exists, accept it and trigger cooldown.
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Tab' && titleSuggestion) {
      e.preventDefault();
      setTitle(prev => prev + titleSuggestion);
      setTitleSuggestion('');
      setTitleCooldown(true);
      setTimeout(() => setTitleCooldown(false), 3000);
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
    }
  };

  // KeyDown for text: if Tab is pressed and a suggestion exists, accept it and trigger cooldown.
  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab' && textSuggestion) {
      e.preventDefault();
      setText(prev => prev + textSuggestion);
      setTextSuggestion('');
      setTextCooldown(true);
      setTimeout(() => setTextCooldown(false), 3000);
      if (textDebounce.current) clearTimeout(textDebounce.current);
    }
  };

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

  const postQuestion = async () => {
    if (!validateForm()) return;
    // Map tag names to tag objects.
    const tags = tagNames.map(tagName => ({
      name: tagName,
      description: 'user added tag',
    }));
    // Create the question payload; include the local generateAIAnswer flag.
    const question: Question & { generateAI?: boolean } = {
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
      generateAI: generateAIAnswer,
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
    generateAIAnswer,
    setGenerateAIAnswer,
  };
};

export default useNewQuestion;
