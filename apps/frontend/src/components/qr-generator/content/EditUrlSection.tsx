'use client';

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect, useState } from 'react';
import { UrlInputSchema, type TUrlInput } from '@shared/schemas';
import { ArrowTurnLeftUpIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { getShortUrlFromCode } from '@/lib/utils';

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

const _EditUrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations('generator.contentSwitch.url');
	const { shortUrl } = useQrCodeGeneratorStore((state) => state);
	const [originalUrl, setOriginalUrl] = useState<string | null>(null);

	const form = useForm<Omit<FormValues, 'shortUrl'>>({
		resolver: standardSchemaResolver(UrlInputSchema),
		defaultValues: {
			url:
				value.isEditable && shortUrl?.destinationUrl ? shortUrl.destinationUrl : (value?.url ?? ''),
			isEditable: value?.isEditable ?? false,
		},
	});

	const [debounced] = useDebouncedValue(originalUrl, 300);

	function onSubmit(values: FormValues) {
		if (!originalUrl) return;
		const payload = {
			...values,
			url: originalUrl,
			shortUrl: shortUrl ? getShortUrlFromCode(shortUrl.shortCode) : null,
		};

		onChange(payload);
	}

	useEffect(() => {
		if (
			JSON.stringify(debounced) === '{}' ||
			JSON.stringify(debounced) === JSON.stringify(value?.url) ||
			debounced === null
		) {
			return;
		}
		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<FormField
						control={form.control}
						name="url"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										{...field}
										value={originalUrl ?? field.value}
										onChange={(e) => {
											const val = e.target.value;
											setOriginalUrl(val);
											field.onChange(val);
										}}
										maxLength={1000}
										className="p-6"
										placeholder={t('placeholder')}
										autoFocus
										onBlur={(e) => {
											if (e.target.value === '') return;
											if (
												!e.target.value.startsWith('http://') &&
												!e.target.value.startsWith('https://')
											) {
												const withHttps = `https://${e.target.value}`;
												setOriginalUrl(withHttps);
												field.onChange(withHttps);
											}
										}}
									/>
								</FormControl>

								{form.getValues().isEditable && shortUrl && (
									<div className="-mt-1 ml-6 flex items-center opacity-100 transition-opacity duration-300 ease-in-out">
										<ArrowTurnLeftUpIcon className="-mt-2 mr-2 h-6 w-6 font-bold" />
										<span className="text-muted-foreground pt-1 text-sm">
											{getShortUrlFromCode(shortUrl.shortCode)}
										</span>
									</div>
								)}

								<FormMessage />
							</FormItem>
						)}
					/>
				</form>
			</Form>
		</>
	);
};

// Custom equality function to prevent unnecessary re-renders
function areEditUrlPropsEqual(prev: TUrlSectionProps, next: TUrlSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

// Export memoized component
export const EditUrlSection = memo(_EditUrlSection, areEditUrlPropsEqual);
