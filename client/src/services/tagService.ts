import { DatabaseTag, TagData } from '../types/types';
import api from './config';

const TAG_API_URL = `https://cs4530-s25-605-api.onrender.com/tag`;

/**
 * Function to get tags with the number of associated questions.
 */
const getTagsWithQuestionNumber = async (): Promise<TagData[]> => {
  const res = await api.get(`${TAG_API_URL}/getTagsWithQuestionNumber`);
  if (res.status !== 200) {
    throw new Error('Error when fetching tags with question number');
  }
  return res.data;
};

/**
 * Function to get a tag by its name.
 */
const getTagByName = async (name: string): Promise<DatabaseTag> => {
  const res = await api.get(`${TAG_API_URL}/getTagByName/${name}`);
  if (res.status !== 200) {
    throw new Error(`Error when fetching tag: ${name}`);
  }
  return res.data;
};

/**
 * Function to get the predefined list of tags.
 */
const getPredefinedTags = async (): Promise<TagData[]> => {
  const res = await api.get(`${TAG_API_URL}/getPredefinedTags`);
  if (res.status !== 200) {
    throw new Error('Error when fetching predefined tags');
  }
  return res.data;
};

export { getTagsWithQuestionNumber, getTagByName, getPredefinedTags };
