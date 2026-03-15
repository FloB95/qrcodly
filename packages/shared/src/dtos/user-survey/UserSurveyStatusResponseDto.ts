import { z } from 'zod';

export const UserSurveyStatusResponseDto = z.object({
	hasResponded: z.boolean(),
});

export type TUserSurveyStatusResponseDto = z.infer<typeof UserSurveyStatusResponseDto>;
