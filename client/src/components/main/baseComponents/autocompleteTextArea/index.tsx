import React, { useRef, useEffect } from 'react';
import './index.css';

export interface AutocompleteTextAreaProps {
  title: string;
  mandatory?: boolean;
  hint?: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  suggestion?: string;
}

const AutocompleteTextArea: React.FC<AutocompleteTextAreaProps> = ({
  title,
  mandatory = true,
  hint,
  id,
  value,
  onChange,
  error,
  onKeyDown,
  suggestion,
}) => {
  const mirrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mirrorRef.current) {
      // Render the user input followed by the suggestion inline.
      mirrorRef.current.innerHTML =
        value +
        (suggestion ? `<span class="suggestion">⎇ TAB to accept: ${suggestion}</span>` : '');
    }
  }, [value, suggestion]);

  return (
    <div className='autocomplete-textarea-container'>
      <div className='input_title'>
        {title}
        {mandatory ? '*' : ''}
      </div>
      {hint && <div className='input_hint'>{hint}</div>}
      <div className='textarea-wrapper'>
        <div className='mirror' ref={mirrorRef}></div>
        <textarea
          id={id}
          className='input_input'
          value={value}
          onChange={e => onChange(e.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {error && <div className='input_error'>{error}</div>}
    </div>
  );
};

export default AutocompleteTextArea;
