import {
	SHORT_URL_ALIAS_MIN_LENGTH,
	ShortUrlAliasConflict,
	ShortUrlAliasSchema,
	type TShortUrlAliasAvailabilityResponseDto,
} from '@shared/schemas';

export enum AliasInputStatus {
	EMPTY = 'empty',
	/** The alias the short URL already has. */
	UNCHANGED = 'unchanged',
	TOO_SHORT = 'tooShort',
	TRAILING_HYPHEN = 'trailingHyphen',
	CHECKING = 'checking',
	AVAILABLE = 'available',
	TAKEN = 'taken',
	NOT_AVAILABLE = 'notAvailable',
	/** The check itself failed; saving decides. */
	CHECK_FAILED = 'checkFailed',
}

/** Whether an alias in this state may be sent. The API has the last word either way. */
export const canSaveAlias = (status: AliasInputStatus) =>
	status === AliasInputStatus.AVAILABLE || status === AliasInputStatus.CHECK_FAILED;

export function aliasInputStatus({
	value,
	currentAlias,
	check,
}: {
	value: string;
	currentAlias: string | null;
	/** The availability check of exactly this value; `pending` while it is not answered. */
	check: 'pending' | 'failed' | TShortUrlAliasAvailabilityResponseDto;
}): AliasInputStatus {
	if (value === '') return AliasInputStatus.EMPTY;
	if (value === currentAlias) return AliasInputStatus.UNCHANGED;
	if (value.length < SHORT_URL_ALIAS_MIN_LENGTH) return AliasInputStatus.TOO_SHORT;
	// after slugifyAlias only a hyphen at the end is left to be wrong
	if (!ShortUrlAliasSchema.safeParse(value).success) return AliasInputStatus.TRAILING_HYPHEN;
	if (check === 'pending') return AliasInputStatus.CHECKING;
	if (check === 'failed') return AliasInputStatus.CHECK_FAILED;
	if (check.available) return AliasInputStatus.AVAILABLE;
	return check.conflict === ShortUrlAliasConflict.TAKEN
		? AliasInputStatus.TAKEN
		: AliasInputStatus.NOT_AVAILABLE;
}
