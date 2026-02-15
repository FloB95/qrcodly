import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { ISqlQueryFindBy } from '@/core/interface/repository.interface';
import { type TTag } from '../domain/entities/tag.entity';

@injectable()
export class ListTagsUseCase implements IBaseUseCase {
	constructor(@inject(TagRepository) private tagRepository: TagRepository) {}

	async execute({ limit, page, where }: ISqlQueryFindBy<TTag>) {
		const tags = await this.tagRepository.findAll({ limit, page, where });
		const total = await this.tagRepository.countTotal(where);

		return { tags, total };
	}
}
