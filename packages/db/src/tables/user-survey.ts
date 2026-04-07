import { datetime, mysqlEnum, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { createTable } from '../utils';

const userSurvey = createTable(
	'user_survey',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		userId: varchar('user_id', { length: 255 }).notNull(),
		rating: mysqlEnum('rating', ['up', 'down']).notNull(),
		feedback: text('feedback'),
		createdAt: datetime('created_at').notNull(),
	},
	(t) => [uniqueIndex('i_user_survey_user_id').on(t.userId)],
);

export type TUserSurvey = typeof userSurvey.$inferSelect;
export default userSurvey;
