import React from 'react';
import useNewQuestion from '../../../hooks/useNewQuestion';
import useProfileSettings from '../../../hooks/useProfileSettings'; // to read the global AI toggle for autocomplete
import Form from '../baseComponents/form';
import AutocompleteInput from '../baseComponents/autocompleteInput';
import AutocompleteTextArea from '../baseComponents/autocompleteTextArea';
import TagSelector from '../../common/TagSelector';
import './index.css';

const NewQuestionPage: React.FC = () => {
  const {
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
  } = useNewQuestion();

  // Global AI toggle from profile settings affects autocomplete only.
  const { aiToggler } = useProfileSettings();

  return (
    <Form>
      <AutocompleteInput
        title='Question Title'
        hint='Limit title to 100 characters or less'
        id='formTitleInput'
        value={title}
        onChange={setTitle}
        error={titleErr}
        onKeyDown={handleTitleKeyDown}
        suggestion={titleSuggestion}
      />
      <AutocompleteTextArea
        title='Question Text'
        hint='Add details'
        id='formTextInput'
        value={text}
        onChange={setText}
        error={textErr}
        onKeyDown={handleTextKeyDown}
        suggestion={textSuggestion}
      />
      <div className='tag-selector-container'>
        <label className='tag-selector-label'>Tags</label>
        <TagSelector selectedTags={tagNames} setSelectedTags={setTagNames} />
        {tagErr && <div className='error'>{tagErr}</div>}
      </div>

      {/* Local "Generate AI Answer" checkbox.
          It is enabled regardless of the global AI setting.
          (The global toggle only affects autocomplete suggestions.) */}
      <div className='ai-toggle-container' style={{ marginTop: '1rem' }}>
        <label>
          <input
            type='checkbox'
            checked={generateAIAnswer}
            onChange={e => setGenerateAIAnswer(e.target.checked)}
          />
          Generate AI Answer
        </label>
      </div>

      <div className='btn_indicator_container'>
        <button className='form_postBtn' onClick={postQuestion}>
          Post Question
        </button>
        <div className='mandatory_indicator'>* indicates mandatory fields</div>
      </div>
    </Form>
  );
};

export default NewQuestionPage;
