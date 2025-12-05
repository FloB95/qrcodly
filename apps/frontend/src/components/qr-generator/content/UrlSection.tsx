'use client';

import { Input } from '@/components/ui/input';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
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
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@clerk/nextjs';
import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { UrlInputSchema, type TUrlInput } from '@shared/schemas';
import { ArrowTurnLeftUpIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { getShortUrlFromCode } from '@/lib/utils';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations('generator.contentSwitch.url');
	const { data: shortUrl } = useGetReservedShortUrlQuery();
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [originalUrl, setOriginalUrl] = useState<string | null>(null);
	const { content, config } = useQrCodeGeneratorStore((state) => state);
	const [hasMounted, setHasMounted] = useState(false);

	const form = useForm<Omit<FormValues, 'shortUrl'>>({
		resolver: standardSchemaResolver(UrlInputSchema),
		defaultValues: {
			url: value?.url ?? '',
			isEditable: value?.isEditable ?? true,
		},
	});
	form.setValue('isEditable', isSignedIn && value?.isEditable ? true : false);

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
		setHasMounted(true);
	}, []);

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

								{form.getValues().isEditable && shortUrl && originalUrl && (
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

					{hasMounted && (
						<div
							className={`transition-opacity duration-300 ease-in-out ${
								originalUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'
							}`}
						>
							<FormField
								control={form.control}
								name="isEditable"
								render={({ field }) => (
									<FormItem>
										<div className="flex">
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={async (e) => {
														if (!isSignedIn) {
															localStorage.setItem('unsavedQrContent', JSON.stringify(content));
															localStorage.setItem('unsavedQrConfig', JSON.stringify(config));
															setAlertOpen(true);
															return;
														}

														if (!shortUrl) return;

														field.onChange(e);
														void form.handleSubmit(onSubmit)();
													}}
												/>
											</FormControl>
											<FormLabel className="relative mt-1 ml-2 pr-2">
												{t('enableEditing')}
											</FormLabel>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}
				</form>
			</Form>

			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
		</>
	);
};
