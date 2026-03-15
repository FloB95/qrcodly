import { z } from 'zod';

export const SubmitUserSurveyDto = z.object({
	rating: z.enum(['up', 'down']),
	feedback: z.string().max(1000).nullable().optional(),
});

export type TSubmitUserSurveyDto = z.infer<typeof SubmitUserSurveyDto>;
