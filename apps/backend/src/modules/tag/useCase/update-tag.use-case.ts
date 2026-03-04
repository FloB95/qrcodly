import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { Logger } from '@/core/logging';
import { type TTag } from '../domain/entities/tag.entity';
import { type TUpdateTagDto, UpdateTagDto } from '@shared/schemas';
import { TagAlreadyExistsError } from '../error/http/tag-already-exists.error';

@injectable()
export class UpdateTagUseCase implements IBaseUseCase {
	constructor(
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(existingTag: TTag, updates: TUpdateTagDto, updatedBy: string): Promise<TTag> {
		const validatedUpdates: Partial<TTag> = UpdateTagDto.parse(updates);
		validatedUpdates.updatedAt = new Date();

		try {
			await this.tagRepository.update(existingTag, validatedUpdates);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
				throw new TagAlreadyExistsError();
			}
			throw error;
		}

		const updatedTag = await this.tagRepository.findOneById(existingTag.id);

		this.logger.info('tag.updated', {
			tag: { id: existingTag.id, updatedBy },
		});

		return updatedTag!;
	}
}
