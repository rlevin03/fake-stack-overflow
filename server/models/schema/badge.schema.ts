import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Badge collection.
 *
 * This schema defines the structure for storing badges in the database.
 * Each badge includes the following fields:
 * - `progress`: The progress towards earning the badge.
 * - `attained`: A boolean indicating if the badge has been attained.
 * - `name`: The name of the badge.
 * - `description`: A brief description of the badge.
 */
const badgeSchema: Schema = new Schema(
  {
    progress: {
      type: Number,
      required: false,
      default: 0,
    },
    attained: {
      type: Boolean,
      required: true,
      default: false,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { collection: 'Badge' },
);

export default badgeSchema;
