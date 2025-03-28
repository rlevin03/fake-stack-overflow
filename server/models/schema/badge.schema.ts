import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Badge collection.
 *
 * This schema defines the structure for storing badges in the database.
 * Each badge includes the following fields:
 * - `level`: The level of the badge.
 * - `progress`: The progress towards earning the badge.
 * - `attained`: A boolean indicating if the badge has been attained.
 * - `name`: The name of the badge.
 * - `description`: A brief description of the badge.
 * - `icon`: The icon of the badge.
 */
const badgeSchema: Schema = new Schema(
  {
    level: {
      type: Number,
      required: true,
    },
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
    icon: {
      type: String,
      required: true,
    },
  },
  { collection: 'Badge' },
);

export default badgeSchema;
