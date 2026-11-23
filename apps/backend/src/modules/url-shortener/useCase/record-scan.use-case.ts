import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { type TTrackScanDto } from '@shared/schemas';
import { EventEmitter } from '@/core/event';
import ShortUrlRepository from '../domain/repository/short-url.repository';
import { ShortUrlScannedEvent } from '../event/short-url-scanned.event';

@injectable()
export class RecordScanUseCase implements IBaseUseCase {
	constructor(
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(EventEmitter) private readonly eventEmitter: EventEmitter,
	) {}

	async execute(shortCode: string, scan: TTrackScanDto): Promise<void> {
		let ownerId: string | null = null;
		try {
			ownerId = (await this.shortUrlRepository.findOneByShortCode(shortCode))?.createdBy ?? null;
		} finally {
			// Also when the lookup fails: the scan is still counted, only without the owner's integrations
			this.eventEmitter.emit(new ShortUrlScannedEvent(shortCode, ownerId, scan));
		}
	}
}
