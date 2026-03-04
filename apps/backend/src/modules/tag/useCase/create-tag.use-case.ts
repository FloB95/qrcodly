import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { Logger } from '@/core/logging';
import { type TTag } from '../domain/entities/tag.entity';
import { type TCreateTagDto } from '@shared/schemas';
import { TagAlreadyExistsError } from '../error/http/tag-already-exists.error';

@injectable()
export class CreateTagUseCase implements IBaseUseCase {
	constructor(
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(dto: TCreateTagDto, createdBy: string): Promise<TTag> {
		const newId = await this.tagRepository.generateId();

		const newTag: Omit<TTag, 'createdAt' | 'updatedAt'> = {
			id: newId,
			name: dto.name,
			color: dto.color,
			createdBy,
		};

		try {
			await this.tagRepository.create(newTag);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
				throw new TagAlreadyExistsError();
			}
			throw error;
		}

		const created = await this.tagRepository.findOneById(newId);
		if (!created) throw new Error('Failed to retrieve Tag');

		this.logger.info('tag.created', {
			tag: { id: created.id, createdBy },
		});

		return created;
	}
}
