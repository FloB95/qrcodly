import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { Logger } from '@/core/logging';
import { type TTag } from '../domain/entities/tag.entity';

@injectable()
export class DeleteTagUseCase implements IBaseUseCase {
	constructor(
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(existingTag: TTag, deletedBy: string): Promise<boolean> {
		const res = await this.tagRepository.delete(existingTag);

		if (res) {
			this.logger.info('tag.deleted', {
				tag: { id: existingTag.id, deletedBy },
			});
		} else {
			this.logger.error('error.tag.deleted', {
				tag: { id: existingTag.id, deletedBy },
			});
		}

		return res;
	}
}
