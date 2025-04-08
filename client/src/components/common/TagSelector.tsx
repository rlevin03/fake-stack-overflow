import React, { useState, useEffect } from 'react';
import { getPredefinedTags } from '../../services/tagService';
import './TagSelector.css';

interface TagData {
  name: string;
  qcnt: number;
}

interface TagSelectorProps {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  inputPlaceholder?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  setSelectedTags,
  inputPlaceholder = 'Filter tags...',
}) => {
  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [filterText, setFilterText] = useState<string>('');

  useEffect(() => {
    getPredefinedTags()
      .then(tags => setAllTags(tags))
      .catch(err => {});
  }, []);

  // Filter tags: if filterText is empty, show all; else filter by tag name.
  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().startsWith(filterText.toLowerCase()),
  );

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  return (
    <div className='tag-selector'>
      <input
        className='tag-filter-input'
        type='text'
        placeholder={inputPlaceholder}
        value={filterText}
        onChange={e => setFilterText(e.target.value)}
      />
      <div className='tag-list'>
        {filteredTags.map(tag => (
          <button
            key={tag.name}
            className={`tag-button ${selectedTags.includes(tag.name) ? 'tag-button-selected' : ''}`}
            onClick={() => toggleTag(tag.name)}>
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagSelector;
