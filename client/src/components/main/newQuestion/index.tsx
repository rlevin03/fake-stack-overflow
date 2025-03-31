import React from 'react';
import useNewQuestion from '../../../hooks/useNewQuestion';
import useProfileSettings from '../../../hooks/useProfileSettings'; // <-- Import the same hook
import Form from '../baseComponents/form';
import Input from '../baseComponents/input';
import TextArea from '../baseComponents/textarea';
import TagSelector from '../../common/TagSelector';
import './index.css';

const NewQuestionPage = () => {
  // Existing logic for new question
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
  } = useNewQuestion();

  // Reuse the same AI toggle from profile settings
  const { aiToggler, handleToggleAIToggler } = useProfileSettings();

  return (
    <Form>
      <Input
        title='Question Title'
        hint='Limit title to 100 characters or less'
        id='formTitleInput'
        val={title}
        setState={setTitle}
        err={titleErr}
      />
      <TextArea
        title='Question Text'
        hint='Add details'
        id='formTextInput'
        val={text}
        setState={setText}
        err={textErr}
      />
      <div className='tag-selector-container'>
        <label className='tag-selector-label'>Tags</label>
        <TagSelector selectedTags={tagNames} setSelectedTags={setTagNames} />
        {tagErr && <div className='error'>{tagErr}</div>}
      </div>

      {/* NEW: The same AI toggle from profile settings */}
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
