import UserModel from '../models/users.model';
import {
  DatabaseUser,
  SafeDatabaseUser,
  User,
  UserCredentials,
  UserResponse,
  UsersResponse,
} from '../types/types';

/**
 * Helper to convert unknown errors to a readable string.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Saves a new user to the database.
 *
 * @param user - The user object to be saved, containing user details like username, password, etc.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export const saveUser = async (user: User): Promise<UserResponse> => {
  try {
    const result: DatabaseUser = await UserModel.create(user);
    if (!result) {
      throw new Error('Failed to create user');
    }

    // Remove password from the returned object
    const safeUser: SafeDatabaseUser = {
      _id: result._id,
      username: result.username,
      dateJoined: result.dateJoined,
      biography: result.biography,
      points: result.points,
    };
    return safeUser;
  } catch (error: unknown) {
    return { error: `Error occurred when saving user: ${formatError(error)}` };
  }
};

/**
 * Retrieves a user from the database by their username (excluding password).
 *
 * @param username - The username of the user to find.
 * @returns The found user object (without the password) or an error message.
 */
export const getUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username })
      .select('-password')
      .lean();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error: unknown) {
    return { error: `Error occurred when finding user: ${formatError(error)}` };
  }
};

/**
 * Retrieves all users from the database (excluding passwords).
 * Users are returned in the order they were created (oldest first).
 *
 * @returns An array of user objects or an error message.
 */
export const getUsersList = async (): Promise<UsersResponse> => {
  try {
    const users: SafeDatabaseUser[] = await UserModel.find().select('-password').lean();
    return users; // If no users, returns empty array []
  } catch (error: unknown) {
    return { error: `Error occurred when finding users: ${formatError(error)}` };
  }
};

/**
 * Authenticates a user by verifying their username and password.
 * (Note: This is not secure for production without hashing!)
 *
 * @param loginCredentials - An object containing the username and password.
 * @returns The authenticated user object (without the password) or an error message.
 */
export const loginUser = async (loginCredentials: UserCredentials): Promise<UserResponse> => {
  const { username, password } = loginCredentials;

  try {
    const user: SafeDatabaseUser | null = await UserModel.findOne({ username, password })
      .select('-password')
      .lean();
    if (!user) {
      throw new Error('Authentication failed');
    }
    return user;
  } catch (error: unknown) {
    return { error: `Error occurred when authenticating user: ${formatError(error)}` };
  }
};

/**
 * Deletes a user from the database by their username.
 *
 * @param username - The username of the user to delete.
 * @returns The deleted user object (without the password) or an error message.
 */
export const deleteUserByUsername = async (username: string): Promise<UserResponse> => {
  try {
    const deletedUser: SafeDatabaseUser | null = await UserModel.findOneAndDelete({
      username,
    })
      .select('-password')
      .lean();
    if (!deletedUser) {
      throw new Error('Error deleting user');
    }
    return deletedUser;
  } catch (error: unknown) {
    return { error: `Error occurred when deleting user: ${formatError(error)}` };
  }
};

/**
 * Updates user information in the database.
 *
 * @param username - The username of the user to update.
 * @param updates - An object containing the fields to update and their new values.
 * @returns The updated user object (without the password) or an error message.
 */
export const updateUser = async (
  username: string,
  updates: Partial<User>,
): Promise<UserResponse> => {
  try {
    const updatedUser: SafeDatabaseUser | null = await UserModel.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true },
    )
      .select('-password')
      .lean();
    if (!updatedUser) {
      throw new Error('Error updating user');
    }
    return updatedUser;
  } catch (error: unknown) {
    return { error: `Error occurred when updating user: ${formatError(error)}` };
  }
};

/**
 * Returns up to 10 users with the highest points, sorted descending (excluding passwords).
 *
 * @returns Either an array of users or an error object.
 */
export const getTop10ByPoints = async (): Promise<SafeDatabaseUser[] | { error: string }> => {
  try {
    const top10 = await UserModel.find().select('-password').sort({ points: -1 }).limit(10).lean();
    return top10; // If no users, returns empty array []
  } catch (error: unknown) {
    return { error: `Error retrieving top 10 by points: ${formatError(error)}` };
  }
};

/**
 * Returns the rank of a user by username, based on how many users have strictly more points.
 *
 * @param username - The username whose rank we want to find.
 * @returns An object with `rank` or an error object.
 */
export const getRankForUser = async (
  username: string,
): Promise<{ rank: number } | { error: string }> => {
  try {
    const user = await UserModel.findOne({ username }).lean();
    if (!user) {
      return { error: 'User not found' };
    }

    // Count how many users have strictly more points than this user
    const higherPointsCount = await UserModel.countDocuments({ points: { $gt: user.points } });
    const rank = higherPointsCount + 1; // rank is 1-based

    return { rank };
  } catch (error: unknown) {
    return { error: `Error retrieving user rank: ${formatError(error)}` };
  }
};
