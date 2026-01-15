import { singleton } from 'tsyringe';
import { desc, eq } from 'drizzle-orm';
import AbstractRepository from '@/core/domain/repository/abstract.repository';
import { type ISqlQueryFindBy } from '@/core/interface/repository.interface';
import configTemplate, { TConfigTemplate } from '../entities/config-template.entity';

/**
 * Repository for managing ConfigTemplate entities.
 */
@singleton()
class ConfigTemplateRepository extends AbstractRepository<TConfigTemplate> {
	table = configTemplate;

	constructor() {
		super();
	}

	/**
	 * Finds all config templates based on the provided query parameters.
	 * @param options - Query options.
	 * @returns A promise that resolves to an array of config templates.
	 */
	async findAll({
		limit,
		page,
		where,
	}: ISqlQueryFindBy<TConfigTemplate>): Promise<TConfigTemplate[]> {
		const query = this.db.select().from(this.table).orderBy(desc(this.table.createdAt)).$dynamic();

		// Add where conditions
		if (where) void this.withWhere(query, where);

		// Add pagination
		void this.withPagination(query, page, limit);
		const configTemplates = await query.execute();
		return configTemplates;
	}

	/**
	 * Finds a config template by its ID.
	 * @param id - The ID of the config template.
	 * @returns A promise that resolves to the config template if found, otherwise undefined.
	 */
	async findOneById(id: string): Promise<TConfigTemplate | undefined> {
		const configTemplate = await this.db.query.configTemplate.findFirst({
			where: eq(this.table.id, id),
		});
		return configTemplate;
	}

	/**
	 * Updates a config template with the provided updates.
	 * @param configTemplate - The config template to update.
	 * @param updates - The updates to apply to the config template.
	 */
	async update(configTemplate: TConfigTemplate, updates: Partial<TConfigTemplate>): Promise<void> {
		await this.db.update(this.table).set(updates).where(eq(this.table.id, configTemplate.id));
	}

	/**
	 * Deletes a config template.
	 * @param configTemplate - The config template to delete.
	 * @returns A promise that resolves to true if the config template was deleted successfully.
	 */
	async delete(configTemplate: TConfigTemplate): Promise<boolean> {
		await this.db.delete(this.table).where(eq(this.table.id, configTemplate.id)).execute();
		await this.clearCache();
		return true;
	}

	/**
	 * Creates a new config template.
	 * @param configTemplate - The config template to create.
	 */
	async create(configTemplate: Omit<TConfigTemplate, 'createdAt' | 'updatedAt'>): Promise<void> {
		await this.db
			.insert(this.table)
			.values({
				id: configTemplate.id,
				name: configTemplate.name,
				config: configTemplate.config,
				createdAt: new Date(),
				createdBy: configTemplate.createdBy,
			})
			.execute();

		await this.clearCache();
	}
}

export default ConfigTemplateRepository;
