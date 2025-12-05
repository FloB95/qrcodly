'use client';

import { Input } from '@/components/ui/input';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect } from 'react';
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

export const EditUrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations('generator.contentSwitch.url');
	const { shortUrl } = useQrCodeGeneratorStore((state) => state);

	console.log('EditUrlSection render', value);

	const form = useForm<Omit<FormValues, 'shortUrl'>>({
		resolver: standardSchemaResolver(UrlInputSchema),
		defaultValues: {
			url:
				value.isEditable && shortUrl?.destinationUrl ? shortUrl.destinationUrl : (value?.url ?? ''),
			isEditable: value?.isEditable ?? false,
		},
	});

	const [debounced] = useDebouncedValue(form.watch('url'), 300);

	function onSubmit(values: FormValues) {
		const payload = {
			...values,
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
