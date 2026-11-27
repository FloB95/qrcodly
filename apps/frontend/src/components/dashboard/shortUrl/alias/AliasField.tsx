'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, X } from 'lucide-react';
import { SHORT_URL_ALIAS_MAX_LENGTH, SHORT_URL_ALIAS_MIN_LENGTH } from '@shared/schemas';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { AliasInputStatus } from './alias-input-status';

interface AliasFieldProps {
	label: string;
	/** The custom domain the alias lives on. */
	domain: string;
	value: string;
	onChange: (typed: string) => void;
	status: AliasInputStatus;
}

const ERROR_STATUSES = [
	AliasInputStatus.TOO_SHORT,
	AliasInputStatus.TRAILING_HYPHEN,
	AliasInputStatus.TAKEN,
	AliasInputStatus.NOT_AVAILABLE,
];

/** The alias input with its address prefix and the answer of the availability check below it. */
export function AliasField({ label, domain, value, onChange, status }: AliasFieldProps) {
	const t = useTranslations('shortUrl.alias');
	const id = useId();
	const statusId = `${id}-status`;
	const isError = ERROR_STATUSES.includes(status);

	const address = `${domain}/u/${value}`;

	return (
		<div className="space-y-2">
			<div className="flex items-baseline justify-between gap-3">
				<Label htmlFor={id}>{label}</Label>
				<span className="text-xs text-muted-foreground">
					{value.length} / {SHORT_URL_ALIAS_MAX_LENGTH}
				</span>
			</div>
			<InputGroup
				className={cn(
					'overflow-hidden',
					status === AliasInputStatus.AVAILABLE && 'border-green-700',
				)}
			>
				<InputGroupText className="self-stretch border-r bg-muted px-3 whitespace-nowrap">
					{domain}/u/
				</InputGroupText>
				<InputGroupInput
					id={id}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={t('placeholder')}
					autoComplete="off"
					spellCheck={false}
					aria-invalid={isError}
					aria-describedby={statusId}
				/>
			</InputGroup>
			<p
				id={statusId}
				aria-live="polite"
				className={cn(
					'flex min-h-5 items-start gap-1.5 text-sm text-muted-foreground',
					isError && 'text-destructive',
					status === AliasInputStatus.AVAILABLE && 'text-green-700',
				)}
			>
				{status === AliasInputStatus.CHECKING && (
					<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
				)}
				{status === AliasInputStatus.AVAILABLE && (
					<Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				)}
				{isError && <X className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
				<span className="break-all">
					{status === AliasInputStatus.EMPTY && t('hint')}
					{status === AliasInputStatus.UNCHANGED && t('unchanged')}
					{status === AliasInputStatus.TOO_SHORT &&
						t('tooShort', { min: SHORT_URL_ALIAS_MIN_LENGTH })}
					{status === AliasInputStatus.TRAILING_HYPHEN && t('trailingHyphen')}
					{status === AliasInputStatus.CHECKING && t('checking')}
					{status === AliasInputStatus.AVAILABLE && t('available', { address })}
					{status === AliasInputStatus.TAKEN && t('taken', { domain })}
					{status === AliasInputStatus.NOT_AVAILABLE && t('notAvailable')}
					{status === AliasInputStatus.CHECK_FAILED && t('checkFailed')}
				</span>
			</p>
		</div>
	);
}
