// client/src/hooks/useAnswerForm.ts
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { validateHyperlink } from '../tool';
import { addAnswer } from '../services/answerService';
import useUserContext from './useUserContext';
import { Answer } from '../types/types';

const useAnswerForm = () => {
  const { qid } = useParams();
  const navigate = useNavigate();
  const { user } = useUserContext();
  const [text, setText] = useState<string>('');
  const [textErr, setTextErr] = useState<string>('');
  const [questionID, setQuestionID] = useState<string>('');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  const socketRef = useRef<Socket | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!qid) {
      setTextErr('Question ID is missing.');
      navigate('/home');
      return;
    }
    setQuestionID(qid);
  }, [qid, navigate]);

  // Setup socket connection for autocomplete suggestions
  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:8000');
    const socket = socketRef.current;
    // Listen specifically for answer autocomplete suggestions
    socket.on('aiAutoCompleteResponseAnswer', (suggestion: string) => {
      setAiSuggestion(suggestion);
    });
    return () => {
      socket.off('aiAutoCompleteResponseAnswer');
      socket.disconnect();
    };
  }, []);

  // Only trigger autocomplete if user's AI toggler is enabled
  const aiSuggestionsEnabled = user.aiToggler === true;

  // Debounce input: when text changes, wait 4 seconds before emitting an autocomplete request.
  useEffect(() => {
    if (!aiSuggestionsEnabled) {
      setAiSuggestion('');
      return;
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (text.trim() === '') {
      setAiSuggestion('');
      return;
    }
    debounceTimer.current = setTimeout(() => {
      // Emit an object with field 'answer' and the current text.
      socketRef.current?.emit('aiAutoComplete', { field: 'answer', text });
    }, 4000);

    // eslint-disable-next-line consistent-return
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [text, aiSuggestionsEnabled]);

  // Handle keyDown events; if Tab is pressed and a suggestion exists, append it.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab' && aiSuggestion) {
      e.preventDefault();
      setText(prev => prev + aiSuggestion);
      setAiSuggestion('');
    }
  };

  // Post answer function
  const postAnswer = async () => {
    let isValid = true;
    if (!text) {
      setTextErr('Answer text cannot be empty');
      isValid = false;
    }
    if (!validateHyperlink(text)) {
      setTextErr('Invalid hyperlink format.');
      isValid = false;
    }
    if (!isValid) return;

    const answer: Answer = {
      text,
      ansBy: user.username,
      ansDateTime: new Date(),
      comments: [],
      upVotes: [],
      downVotes: [],
    };

    const res = await addAnswer(questionID, answer);

    if (res && res._id) {
      navigate(`/question/${questionID}`);
    }
  };

  return {
    text,
    setText,
    textErr,
    postAnswer,
    aiSuggestion,
    handleKeyDown,
  };
};

export default useAnswerForm;
