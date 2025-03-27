import { Schema } from 'mongoose';

/**
 * Mongoose schema for the User collection.
 *
 * This schema defines the structure for storing users in the database.
 * Each User includes the following fields:
 * - `username`: The username of the user.
 * - `password`: The encrypted password securing the user's account.
 * - `dateJoined`: The date the user joined the platform.
 * - 'biography': The user's biography.
 * - 'questionsAsked': The questions the user has asked.
 * - 'questionsAnswered': The questions the user has answered.
 * - 'badges': The badges the user has earned.
 * - 'points': The points the user has earned.
 * - 'questionsUpvoted': list of questions the user has upvoted
 * - 'questionsDownvoted': list of questions the user has downvoted.
 * - 'answersUpvoted': list of answers the user has upvoted.
 * - 'answersDownvoted': list of answers the user has downvoted.
 * - 'sessionsAttended': list of sessions the user has attended.
 * - 'aiToggler': boolean to toggle the AI on or off.
 * - 'bookmarkedQuestions': list of questions the user has bookmarked.
 * - 'preferences': vector conisting of tags interested in.
 */
const userSchema: Schema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      immutable: true,
    },
    password: {
      type: String,
    },
    dateJoined: {
      type: Date,
    },
    biography: {
      type: String,
      default: '',
    },
    questionsAsked: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
    },
    questionsAnswered: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
      default: [],
    },
    badges: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
      default: [],
    },
    points: {
      type: Number,
      default: 0,
    },
    questionsUpvoted: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
    },
    questionsDownvoted: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
    },
    answersUpvoted: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
      default: [],
    },
    answersDownvoted: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Answer' }],
      default: [],
    },
    sessionsAttended: {
      type: [String],
      default: [],
    },
    aiToggler: {
      type: Boolean,
      default: true,
    },
    bookmarkedQuestions: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
    },
    preferences: {
      type: [Number],
      default: () => Array(1000).fill(0),
    },
  },
  { collection: 'User' },
);

export default userSchema;
