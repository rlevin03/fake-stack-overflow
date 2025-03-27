import express, { Request, Response, Router } from 'express';
import tagIndexMap from '@fake-stack-overflow/shared/tagIndexMap.json'; // Import the predefined tag map
import { getTagCountMap } from '../services/tag.service';
import TagModel from '../models/tags.model';
import { DatabaseTag } from '../types/types';

const tagController = () => {
  const router: Router = express.Router();

  /**
   * Retrieves a list of tags along with the number of questions associated with each tag.
   */
  const getTagsWithQuestionNumber = async (_: Request, res: Response): Promise<void> => {
    try {
      const tagcountmap = await getTagCountMap();

      if (!tagcountmap || 'error' in tagcountmap) {
        throw new Error('Error while fetching tag count map');
      }

      res.json(
        Array.from(tagcountmap, ([name, qcnt]: [string, number]) => ({
          name,
          qcnt,
        })),
      );
    } catch (err) {
      res.status(500).send(`Error when fetching tag count map: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves a tag from the database by its name.
   */
  const getTagByName = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const tag: DatabaseTag | null = await TagModel.findOne({ name });
      if (!tag) {
        res.status(404).send(`Tag with name "${name}" not found`);
        return;
      }
      res.json(tag);
    } catch (err) {
      res.status(500).send(`Error when fetching tag: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves the predefined list of 1000 tags from the shared tag index.
   */
  const getPredefinedTags = async (_: Request, res: Response): Promise<void> => {
    try {
      const tags = Object.keys(tagIndexMap).map(tagName => ({
        name: tagName,
        qcnt: 0, // default value; you can update this if needed
      }));
      res.json(tags);
    } catch (err) {
      res.status(500).send(`Error when fetching predefined tags: ${(err as Error).message}`);
    }
  };

  router.get('/getTagsWithQuestionNumber', getTagsWithQuestionNumber);
  router.get('/getTagByName/:name', getTagByName);
  router.get('/getPredefinedTags', getPredefinedTags); // New endpoint

  return router;
};

export default tagController;
