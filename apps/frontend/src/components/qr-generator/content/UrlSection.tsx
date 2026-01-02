'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect, useState } from 'react';
import { UrlInputSchema, type TUrlInput } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { getShortUrlFromCode } from '@/lib/utils';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { Input } from '@/components/ui/input';

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations('generator.contentSwitch.url');
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	const [originalUrl, setOriginalUrl] = useState<string | null>(null);
	const { lastError } = useQrCodeGeneratorStore((state) => state);

	const form = useForm<Omit<FormValues, 'shortUrl'>>({
		resolver: zodResolver(UrlInputSchema),
		criteriaMode: 'all',
		defaultValues: {
			url: value?.url ?? '',
			isEditable: value?.isEditable ?? true,
		},
	});
	const [debounced] = useDebouncedValue<string | null>(originalUrl, 500);

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
		if (lastError?.fieldErrors) {
			lastError.fieldErrors.forEach((e) => {
				if (e.path.length === 0) return;
				form.setError(e.path[e.path.length - 1] as any, {
					message: e.message,
				});
			});
		}
	}, [lastError]);

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

	useEffect(() => {
		form.reset();
		setOriginalUrl(null);
	}, [shortUrl]);

	useEffect(() => {
		if (value?.url) {
			setOriginalUrl(value.url);
		}
	}, [value]);

	useEffect(() => {
		if (value?.isEditable !== undefined && value.isEditable !== form.getValues('isEditable')) {
			form.setValue('isEditable', value.isEditable, { shouldValidate: false });
		}
	}, [value?.isEditable]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="url"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<p translate="no" suppressHydrationWarning>
									Url*
								</p>
							</FormLabel>
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
									placeholder={t('placeholder')}
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
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};
