import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { type THostedAssetUrlsResponseDto } from '@shared/schemas';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import { HostedFileService } from '../service/hosted-file.service';

/** Most images a page references; anything beyond is not a key list the editor sends. */
const MAX_KEYS = 20;

/**
 * Public URLs of the caller's own images, for the editor of a saved page. Independent of whether
 * the page is served at the moment (switched off, offline after Pro), unlike the public page.
 * Documents get none: they are only served through their page.
 */
@injectable()
export class GetHostedAssetUrlsUseCase implements IBaseUseCase {
	constructor(
		@inject(StoredFileRepository) private readonly fileRepository: StoredFileRepository,
		@inject(HostedFileService) private readonly fileService: HostedFileService,
	) {}

	async execute(keys: string[], userId: string): Promise<THostedAssetUrlsResponseDto> {
		const own = [...new Set(keys)]
			.slice(0, MAX_KEYS)
			.filter((key) => this.fileService.belongsTo(key, userId));
		const files = await this.fileRepository.findByFileKeys(own);
		return Object.fromEntries(
			files
				.filter((file) => file.userId === userId && file.kind === 'image')
				.map((file) => [file.fileKey, this.fileService.getPublicUrl(file.fileKey)]),
		);
	}
}
