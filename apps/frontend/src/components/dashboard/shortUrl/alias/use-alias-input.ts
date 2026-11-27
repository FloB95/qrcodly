'use client';

import { useCallback, useState } from 'react';
import { ShortUrlAliasSchema, type TShortUrlAliasAvailabilityResponseDto } from '@shared/schemas';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useShortUrlAliasAvailabilityQuery } from '@/lib/api/url-shortener';
import { slugifyAlias } from '@/lib/short-url-alias';
import { aliasInputStatus } from './alias-input-status';

/**
 * The alias someone is typing: brought into the allowed form as they type and checked against the
 * custom domain once they pause.
 */
export function useAliasInput({
	customDomainId,
	currentAlias = null,
}: {
	customDomainId: string | null | undefined;
	currentAlias?: string | null;
}) {
	const [value, setSlug] = useState(currentAlias ?? '');
	const [checkedValue] = useDebouncedValue(value, 350);
	const setValue = useCallback((typed: string) => setSlug(slugifyAlias(typed)), []);

	const isSettled = checkedValue === value;
	const isCheckable = ShortUrlAliasSchema.safeParse(value).success && value !== currentAlias;
	const availability = useShortUrlAliasAvailabilityQuery(
		customDomainId,
		checkedValue,
		isCheckable && isSettled,
	);

	let check: 'pending' | 'failed' | TShortUrlAliasAvailabilityResponseDto = 'pending';
	if (isSettled && !availability.isFetching) {
		if (availability.isError) check = 'failed';
		else if (availability.data) check = availability.data;
	}

	return { value, setValue, status: aliasInputStatus({ value, currentAlias, check }) };
}
