import React from 'react';
import useNewQuestion from '../../../hooks/useNewQuestion';
import useProfileSettings from '../../../hooks/useProfileSettings'; // reuse AI toggle from profile settings
import Form from '../baseComponents/form';
import AutocompleteInput from '../baseComponents/autocompleteInput';
import AutocompleteTextArea from '../baseComponents/autocompleteTextArea';
import TagSelector from '../../common/TagSelector';
import './index.css';

const NewQuestionPage = () => {
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
  } = useNewQuestion();

  const { aiToggler, handleToggleAIToggler } = useProfileSettings();

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

      {/* Use the same AI toggle from profile settings */}
      <div className='ai-toggle-container' style={{ marginTop: '1rem' }}>
        <label>
          <input type='checkbox' checked={aiToggler} onChange={handleToggleAIToggler} />
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
