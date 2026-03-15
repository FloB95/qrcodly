import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import userSurvey, { type TUserSurvey } from '../entities/user-survey.entity';

@singleton()
class UserSurveyRepository extends AbstractRepository<TUserSurvey> {
	table = userSurvey;

	constructor() {
		super();
	}

	async findAll({ limit, page, where }: ISqlQueryFindBy<TUserSurvey>): Promise<TUserSurvey[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		if (where) void this.withWhere(query, where);
		void this.withPagination(query, page, limit);

		return await query.execute();
	}

	async findOneById(id: string): Promise<TUserSurvey | undefined> {
		return await this.db.query.userSurvey.findFirst({
			where: eq(this.table.id, id),
		});
	}

	async findByUserId(userId: string): Promise<TUserSurvey | undefined> {
		return await this.db.query.userSurvey.findFirst({
			where: eq(this.table.userId, userId),
		});
	}

	async create(item: Omit<TUserSurvey, 'createdAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: item.id,
				userId: item.userId,
				rating: item.rating,
				feedback: item.feedback,
				createdAt: new Date(),
			})
			.execute();
	}

	async update(item: TUserSurvey, updates: Partial<TUserSurvey>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, item.id)).execute();
	}

	async delete(item: TUserSurvey): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, item.id)).execute();
		return true;
	}
}

export default UserSurveyRepository;
