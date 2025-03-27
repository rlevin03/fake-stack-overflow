import express, { Request, Response, Router } from 'express';
import {
  UserRequest,
  User,
  UserCredentials,
  UserByUsernameRequest,
  FakeSOSocket,
  UpdateBiographyRequest,
} from '../types/types';
import {
  deleteUserByUsername,
  getUserByUsername,
  getUserRecommendations,
  getUsersList,
  loginUser,
  saveUser,
  updateUser,
  updateUserPreferences,
} from '../services/user.service';

const userController = (socket: FakeSOSocket) => {
  const router: Router = express.Router();

  /**
   * Validates that the request body contains all required fields for a user.
   * @param req The incoming request containing user data.
   * @returns `true` if the body contains valid user fields; otherwise, `false`.
   */
  const isUserBodyValid = (req: UserRequest): boolean =>
    req.body !== undefined &&
    req.body.username !== undefined &&
    req.body.username !== '' &&
    req.body.password !== undefined &&
    req.body.password !== '';

  /**
   * Validates that the request body contains all required fields to update a biography.
   * @param req The incoming request containing user data.
   * @returns `true` if the body contains valid user fields; otherwise, `false`.
   */
  const isUpdateBiographyBodyValid = (req: UpdateBiographyRequest): boolean =>
    req.body !== undefined &&
    req.body.username !== undefined &&
    req.body.username.trim() !== '' &&
    req.body.biography !== undefined;

  /**
   * Handles the creation of a new user account.
   * @param req The request containing username, email, and password in the body.
   * @param res The response, either returning the created user or an error.
   * @returns A promise resolving to void.
   */
  const createUser = async (req: UserRequest, res: Response): Promise<void> => {
    if (!isUserBodyValid(req)) {
      res.status(400).send('Invalid user body');
      return;
    }

    const requestUser = req.body;

    const user: User = {
      ...requestUser,
      dateJoined: new Date(),
      biography: requestUser.biography ?? '',
      // initialize a 1000-point preference array
      preferences: new Array(1000).fill(0),
    };

    try {
      const result = await saveUser(user);

      if ('error' in result) {
        throw new Error(result.error);
      }

      socket.emit('userUpdate', {
        user: result,
        type: 'created',
      });
      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error when saving user: ${error}`);
    }
  };

  /**
   * Handles user login by validating credentials.
   * @param req The request containing username and password in the body.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const userLogin = async (req: UserRequest, res: Response): Promise<void> => {
    try {
      if (!isUserBodyValid(req)) {
        res.status(400).send('Invalid user body');
        return;
      }

      const loginCredentials: UserCredentials = {
        username: req.body.username,
        password: req.body.password,
      };

      const user = await loginUser(loginCredentials);

      if ('error' in user) {
        throw Error(user.error);
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).send('Login failed');
    }
  };

  /**
   * Retrieves a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either returning the user or an error.
   * @returns A promise resolving to void.
   */
  const getUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    try {
      const { username } = req.params;

      const user = await getUserByUsername(username);

      if ('error' in user) {
        throw Error(user.error);
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).send(`Error when getting user by username: ${error}`);
    }
  };

  /**
   * Retrieves all users from the database.
   * @param res The response, either returning the users or an error.
   * @returns A promise resolving to void.
   */
  const getUsers = async (_: Request, res: Response): Promise<void> => {
    try {
      const users = await getUsersList();

      if ('error' in users) {
        throw Error(users.error);
      }

      res.status(200).json(users);
    } catch (error) {
      res.status(500).send(`Error when getting users: ${error}`);
    }
  };

  /**
   * Deletes a user by their username.
   * @param req The request containing the username as a route parameter.
   * @param res The response, either confirming deletion or returning an error.
   * @returns A promise resolving to void.
   */
  const deleteUser = async (req: UserByUsernameRequest, res: Response): Promise<void> => {
    try {
      const { username } = req.params;

      const deletedUser = await deleteUserByUsername(username);

      if ('error' in deletedUser) {
        throw Error(deletedUser.error);
      }

      socket.emit('userUpdate', {
        user: deletedUser,
        type: 'deleted',
      });
      res.status(200).json(deletedUser);
    } catch (error) {
      res.status(500).send(`Error when deleting user by username: ${error}`);
    }
  };

  /**
   * Resets a user's password.
   * @param req The request containing the username and new password in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const resetPassword = async (req: UserRequest, res: Response): Promise<void> => {
    try {
      if (!isUserBodyValid(req)) {
        res.status(400).send('Invalid user body');
        return;
      }

      const updatedUser = await updateUser(req.body.username, { password: req.body.password });

      if ('error' in updatedUser) {
        throw Error(updatedUser.error);
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user password: ${error}`);
    }
  };

  /**
   * Updates a user's biography.
   * @param req The request containing the username and biography in the body.
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const updateBiography = async (req: UpdateBiographyRequest, res: Response): Promise<void> => {
    try {
      if (!isUpdateBiographyBodyValid(req)) {
        res.status(400).send('Invalid user body');
        return;
      }

      // Validate that request has username and biography
      const { username, biography } = req.body;

      // Call the same updateUser(...) service used by resetPassword
      const updatedUser = await updateUser(username, { biography });

      if ('error' in updatedUser) {
        throw new Error(updatedUser.error);
      }

      // Emit socket event for real-time updates
      socket.emit('userUpdate', {
        user: updatedUser,
        type: 'updated',
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).send(`Error when updating user biography: ${error}`);
    }
  };

  /**
   * Updates a user's preference vector by applying index-wise updates.
   * @param req The request containing userId and updates (array of { index, value }).
   * @param res The response, either confirming the update or returning an error.
   * @returns A promise resolving to void.
   */
  const updatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, updates } = req.body;

      if (!userId || !Array.isArray(updates)) {
        res.status(400).send('Invalid request body: userId and updates are required');
        return;
      }

      const result = await updateUserPreferences(userId, updates);

      if ('error' in result) {
        throw new Error(result.error);
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error when updating user preferences: ${error}`);
    }
  };

  /**
   * Retrieves personalized question recommendations for a user.
   * @param req The request containing the userId as a route parameter.
   * @param res The response, returning an ordered list of recommended questions.
   * @returns A promise resolving to void.
   */
  const getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).send('Missing userId');
        return;
      }

      const recommendations = await getUserRecommendations(userId);

      if ('error' in recommendations) {
        throw new Error(recommendations.error);
      }

      res.status(200).json(recommendations);
    } catch (error) {
      res.status(500).send(`Error when retrieving recommendations: ${error}`);
    }
  };

  // Define routes for the user-related operations.
  router.post('/signup', createUser);
  router.post('/login', userLogin);
  router.patch('/resetPassword', resetPassword);
  router.get('/getUser/:username', getUser);
  router.get('/getUsers', getUsers);
  router.delete('/deleteUser/:username', deleteUser);
  router.patch('/updateBiography', updateBiography);
  router.patch('/updatePreferences', updatePreferences);
  router.get('/getRecommendations/:userId', getRecommendations);

  return router;
};

export default userController;
