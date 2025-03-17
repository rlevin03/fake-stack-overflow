import { ObjectId } from 'mongodb';

export interface Badge {
  level: number;
  name: string;
  description: string;
  icon: string;
}

export interface DatabaseBadge extends Badge {
  _id: ObjectId;
}
