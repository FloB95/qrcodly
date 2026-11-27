import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { BadRequestError } from '@/core/error/http';
import type { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { SetShortUrlAliasUseCase } from '../set-short-url-alias.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type { ShortUrlAliasService } from '../../service/short-url-alias.service';
import { SHORT_URL_SAFETY_DEFAULTS, type TShortUrl } from '../../domain/entities/short-url.entity';
import { ShortUrlAliasTakenError } from '../../error/http/short-url-alias-taken.error';
import { ShortUrlAliasRequiresCustomDomainError } from '../../error/http/short-url-alias-requires-custom-domain.error';

describe('SetShortUrlAliasUseCase', () => {
	let useCase: SetShortUrlAliasUseCase;
	let repository: MockProxy<ShortUrlRepository>;
	let aliasService: MockProxy<ShortUrlAliasService>;
	let domainValidation: MockProxy<CustomDomainValidationService>;

	const userId = 'user-1';
	const shortUrl = (overrides: Partial<TShortUrl> = {}): TShortUrl => ({
		id: 'short-url-1',
		shortCode: 'abc12',
		alias: null,
		name: null,
		destinationUrl: 'https://example.com',
		customDomainId: 'domain-1',
		isActive: true,
		qrCodeId: null,
		hostedPageId: null,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
		deletedAt: null,
		...SHORT_URL_SAFETY_DEFAULTS,
		...overrides,
	});

	beforeEach(() => {
		repository = mock<ShortUrlRepository>();
		aliasService = mock<ShortUrlAliasService>();
		domainValidation = mock<CustomDomainValidationService>();
		useCase = new SetShortUrlAliasUseCase(
			repository,
			aliasService,
			domainValidation,
			mock<Logger>(),
		);
	});

	it('writes the alias after it was found available for this short URL', async () => {
		await useCase.execute(shortUrl(), 'menu', userId);

		expect(domainValidation.validateForUserUse).toHaveBeenCalledWith('domain-1', userId);
		expect(aliasService.assertAvailable).toHaveBeenCalledWith('domain-1', 'menu', 'short-url-1');
		expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'short-url-1' }), {
			alias: 'menu',
			updatedAt: expect.any(Date),
		});
	});

	it('refuses a short URL without a custom domain', async () => {
		await expect(
			useCase.execute(shortUrl({ customDomainId: null }), 'menu', userId),
		).rejects.toThrow(ShortUrlAliasRequiresCustomDomainError);
		expect(repository.update).not.toHaveBeenCalled();
	});

	it('refuses a reserved short URL, which still follows the default domain', async () => {
		await expect(
			useCase.execute(shortUrl({ destinationUrl: null }), 'menu', userId),
		).rejects.toThrow(BadRequestError);
		expect(repository.update).not.toHaveBeenCalled();
	});

	it('allows the link of a hosted page, which has no destination of its own', async () => {
		await useCase.execute(
			shortUrl({ destinationUrl: null, hostedPageId: 'page-1' }),
			'menu',
			userId,
		);

		expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'short-url-1' }), {
			alias: 'menu',
			updatedAt: expect.any(Date),
		});
	});

	it('does not write when the short URL already has this alias', async () => {
		await useCase.execute(shortUrl({ alias: 'menu' }), 'menu', userId);

		expect(aliasService.assertAvailable).not.toHaveBeenCalled();
		expect(repository.update).not.toHaveBeenCalled();
	});

	it('removes the alias with null, whatever state the custom domain is in', async () => {
		await useCase.execute(shortUrl({ alias: 'menu' }), null, userId);

		expect(domainValidation.validateForUserUse).not.toHaveBeenCalled();
		expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'short-url-1' }), {
			alias: null,
			updatedAt: expect.any(Date),
		});
	});

	it('reports a taken alias when the write loses a race for it', async () => {
		repository.update.mockRejectedValue(
			Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }),
		);

		await expect(useCase.execute(shortUrl(), 'menu', userId)).rejects.toThrow(
			ShortUrlAliasTakenError,
		);
	});
});
