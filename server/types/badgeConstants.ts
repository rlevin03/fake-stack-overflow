import { BadgeNameType, BadgeDescriptionType } from './types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const BadgeName = {
  CURIOUS_CAT: 'Curious Cat' as BadgeNameType,
  HELPING_HAND: 'Helping Hand' as BadgeNameType,
  LIFELINE: 'Lifeline' as BadgeNameType,
  LIGHTNING_RESPONDER: 'Lightning Responder' as BadgeNameType,
  RESPECTED_VOICE: 'Respected Voice' as BadgeNameType,
  PEOPLES_CHAMPION: 'Peoples Champion' as BadgeNameType,
} as const;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const BadgeDescription = {
  CURIOUS_CAT: 'Upvoted 10+ questions' as BadgeDescriptionType,
  HELPING_HAND: 'Provided 5+ answers' as BadgeDescriptionType,
  LIFELINE:
    'Answered a question that was unanswered for more than 24 hours.' as BadgeDescriptionType,
  LIGHTNING_RESPONDER:
    'Answered a question within 5 minutes of it being posted.' as BadgeDescriptionType,
  RESPECTED_VOICE:
    'Accumulated 500+ reputation points from upvotes on answers.' as BadgeDescriptionType,
  PEOPLES_CHAMPION: 'Received 50+ upvotes on a single answer.' as BadgeDescriptionType,
} as const;
