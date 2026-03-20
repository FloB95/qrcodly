'use client';

import { memo, useEffect } from 'react';
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
import { UrlInputSchema, type TUrlInput } from '@shared/schemas';
import { validateContentHttpUrls } from '@shared/schemas/dtos/qr-code/validateContentHttpUrls';
import { useTranslations } from 'next-intl';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { Input } from '@/components/ui/input';

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

const UrlSectionBase = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations('generator.contentSwitch.url');
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	const { link: shortUrlLink } = useShortUrlLink(shortUrl);
	const { lastError } = useQrCodeGeneratorStore((state) => state);

	const form = useForm<Omit<FormValues, 'shortUrl'>>({
		resolver: zodResolver(
			UrlInputSchema.superRefine((data, ctx) => {
				validateContentHttpUrls({ type: 'url', data }, ctx, []);
			}),
		),
		criteriaMode: 'all',
		defaultValues: {
			url: value?.url ?? '',
			isDynamic: value?.isDynamic ?? true,
		},
	});

	// Debounce URL input so onChange only fires after the user stops typing.
	// form.handleSubmit validates before calling onChange to prevent invalid URLs.
	const watchedUrl = form.watch('url');
	const [debouncedUrl] = useDebouncedValue(watchedUrl, 500);

	useEffect(() => {
		if (!debouncedUrl || debouncedUrl === value?.url) return;
		void form.handleSubmit((values) => {
			const payload = {
				...values,
				url: debouncedUrl,
				shortUrl: shortUrlLink,
			};
			onChange(payload);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedUrl]);

	// Sync form fields when parent provides new values (e.g. loading a saved QR code)
	useEffect(() => {
		if (value?.url !== undefined && value.url !== form.getValues('url')) {
			form.setValue('url', value.url, { shouldValidate: false });
		}
		if (value?.isDynamic !== undefined && value.isDynamic !== form.getValues('isDynamic')) {
			form.setValue('isDynamic', value.isDynamic, { shouldValidate: false });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value?.url, value?.isDynamic, shortUrl]);

	// Surface server-side validation errors (e.g. duplicate URL) in the form
	useEffect(() => {
		if (!lastError?.fieldErrors) return;
		lastError.fieldErrors.forEach((e) => {
			if (e.path.length === 0) return;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic field path from server validation
			form.setError(e.path[e.path.length - 1] as any, {
				message: e.message,
			});
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lastError]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(() => {})} className="space-y-8">
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
									maxLength={1000}
									placeholder={t('placeholder')}
									onBlur={(e) => {
										if (e.target.value === '') return;
										if (
											!e.target.value.startsWith('http://') &&
											!e.target.value.startsWith('https://')
										) {
											field.onChange(`https://${e.target.value}`);
										}
										void form.trigger('url');
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

function areUrlPropsEqual(prev: TUrlSectionProps, next: TUrlSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const UrlSection = memo(UrlSectionBase, areUrlPropsEqual);
