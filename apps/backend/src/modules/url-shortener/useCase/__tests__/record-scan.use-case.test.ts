import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTrackScanDto } from '@shared/schemas';
import { type EventEmitter } from '@/core/event';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type TShortUrlWithDomain } from '../../domain/entities/short-url.entity';
import { ShortUrlScannedEvent } from '../../event/short-url-scanned.event';
import { RecordScanUseCase } from '../record-scan.use-case';

describe('RecordScanUseCase', () => {
	let repository: MockProxy<ShortUrlRepository>;
	let eventEmitter: MockProxy<EventEmitter>;
	let useCase: RecordScanUseCase;

	const scan: TTrackScanDto = {
		url: 'https://example.com/u/abc12',
		userAgent: 'Mozilla/5.0',
		hostname: 'example.com',
		language: 'en-US',
		referrer: '',
		ip: '203.0.113.42',
		deviceType: 'mobile',
		browserName: 'Chrome',
	};

	const emitted = () => eventEmitter.emit.mock.calls[0]?.[0] as ShortUrlScannedEvent;

	beforeEach(() => {
		repository = mock<ShortUrlRepository>();
		eventEmitter = mock<EventEmitter>();
		useCase = new RecordScanUseCase(repository, eventEmitter);
	});

	it('announces the scan with the owner of the short URL', async () => {
		repository.findOneByShortCode.mockResolvedValue({
			createdBy: 'user-1',
		} as TShortUrlWithDomain);

		await useCase.execute('abc12', scan);

		expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
		expect(emitted()).toBeInstanceOf(ShortUrlScannedEvent);
		expect(emitted()).toMatchObject({ shortCode: 'abc12', ownerId: 'user-1', scan });
	});

	it('announces a scan of an unknown short code without owner', async () => {
		repository.findOneByShortCode.mockResolvedValue(undefined);

		await useCase.execute('zzzzz', scan);

		expect(emitted()).toMatchObject({ shortCode: 'zzzzz', ownerId: null });
	});

	it('still announces the scan when the lookup fails, then rethrows', async () => {
		const failure = new Error('db down');
		repository.findOneByShortCode.mockRejectedValue(failure);

		await expect(useCase.execute('abc12', scan)).rejects.toBe(failure);

		expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
		expect(emitted()).toMatchObject({ shortCode: 'abc12', ownerId: null });
	});
});
