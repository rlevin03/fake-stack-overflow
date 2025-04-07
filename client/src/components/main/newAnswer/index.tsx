import './index.css';
import React from 'react';
import Form from '../baseComponents/form';
import AutocompleteTextArea from '../baseComponents/autocompleteTextArea';
import useAnswerForm from '../../../hooks/useAnswerForm';

const NewAnswerPage = () => {
  const { text, textErr, setText, postAnswer, aiSuggestion, handleKeyDown } = useAnswerForm();

  return (
    <Form>
      <AutocompleteTextArea
        title='Answer Text'
        id='answerTextInput'
        value={text}
        onChange={setText}
        error={textErr}
        onKeyDown={handleKeyDown}
        suggestion={aiSuggestion}
      />
      <div className='btn_indicator_container'>
        <button className='form_postBtn' onClick={postAnswer}>
          Post Answer
        </button>
        <div className='mandatory_indicator'>* indicates mandatory fields</div>
      </div>
    </Form>
  );
};

export default NewAnswerPage;
