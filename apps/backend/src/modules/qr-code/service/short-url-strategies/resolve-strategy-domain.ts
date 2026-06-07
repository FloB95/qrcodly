import { container } from 'tsyringe';
import { GetDefaultCustomDomainUseCase } from '@/modules/custom-domain/useCase/get-default-custom-domain.use-case';
import { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { type IShortUrlStrategyContext } from './short-url-strategy.interface';
import { BadRequestError } from '@/core/error/http';

/**
 * Resolves the effective customDomainId for a strategy run.
 * - `undefined` ctx override → fall back to the user's default custom domain
 * - `null` ctx override → system domain (`qrcodly.de`), explicitly
 * - `string` ctx override → a specific custom domain (validated for ownership)
 *
 * Also enforces "customSlug requires a custom domain". Returning the resolved
 * domain id (or null for system) is the single point that all dynamic-QR
 * strategies (URL, vCard, event) can rely on for consistent behavior.
 */
export async function resolveStrategyDomainId(
	createdBy: string,
	ctx?: IShortUrlStrategyContext,
): Promise<string | null> {
	let resolvedDomainId: string | null;
	if (ctx?.customDomainId !== undefined) {
		// Explicit choice from the user — validate ownership unless it's null (system).
		if (ctx.customDomainId !== null) {
			await container
				.resolve(CustomDomainValidationService)
				.validateForUserUse(ctx.customDomainId, createdBy);
		}
		resolvedDomainId = ctx.customDomainId;
	} else {
		const defaultDomain = await container.resolve(GetDefaultCustomDomainUseCase).execute(createdBy);
		resolvedDomainId = defaultDomain?.id ?? null;
	}

	if (ctx?.customSlug && !resolvedDomainId) {
		throw new BadRequestError('A custom path requires a custom domain.');
	}

	return resolvedDomainId;
}
