'use client';

import { useForm } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	InputGroup,
	InputGroupInput,
	InputGroupAddon,
	InputGroupTextarea,
	InputGroupText,
} from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect, useState } from 'react';
import { EventInputSchema, type TEventInput } from '@shared/schemas/src';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { getShortUrlFromCode } from '@/lib/utils';
import { useGetReservedShortUrlQuery } from '@/lib/api/url-shortener';
import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { useAuth } from '@clerk/nextjs';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { CharacterCounter } from './CharacterCounter';

type EventSectionProps = {
	onChange: (data: TEventInput) => void;
	value: TEventInput;
};

export const EventSection = ({ onChange, value }: EventSectionProps) => {
	const t = useTranslations('generator.contentSwitch.event');
	const [alertOpen, setAlertOpen] = useState(false);
	const { isSignedIn } = useAuth();
	const { config } = useQrCodeGeneratorStore((state) => state);
	const { data: shortUrl } = useGetReservedShortUrlQuery();

	const form = useForm<TEventInput>({
		resolver: zodResolver(EventInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});

	const formValues = form.watch();
	const [debounced] = useDebouncedValue<TEventInput>(formValues, 500);

	function onSubmit(values: TEventInput) {
		if (!isSignedIn) {
			localStorage.setItem(
				'unsavedQrContent',
				JSON.stringify({
					type: 'event',
					data: values,
				}),
			);
			localStorage.setItem('unsavedQrConfig', JSON.stringify(config));
			setAlertOpen(true);
			return;
		}

		if (!shortUrl) return;

		const payload = {
			...values,
			shortUrl: getShortUrlFromCode(shortUrl.shortCode),
		};

		onChange(payload);
	}

	const stableStringify = (obj: unknown) => JSON.stringify(obj, Object.keys(obj as object).sort());

	useEffect(() => {
		if (
			JSON.stringify(debounced) === '{}' ||
			stableStringify(debounced) === stableStringify(value) ||
			debounced.startDate === '' ||
			debounced.endDate === ''
		) {
			return;
		}

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	useEffect(() => {
		form.reset();
	}, [shortUrl]);

	const isoToDatetimeLocal = (iso?: string) => {
		if (!iso) return '';
		const date = new Date(iso);

		const pad = (n: number) => String(n).padStart(2, '0');

		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
			date.getDate(),
		)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	};

	const datetimeLocalToIso = (value: string) => {
		return new Date(value).toISOString();
	};

	return (
		<>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('title.label')}*</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											placeholder={t('title.placeholder')}
											maxLength={200}
											className="pr-20"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={200} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('description.label')}</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupTextarea
											{...field}
											placeholder={t('description.placeholder')}
											maxLength={500}
										/>
										<InputGroupAddon align="block-end">
											<InputGroupText className="ml-auto">
												<CharacterCounter current={field.value?.length || 0} max={500} />
											</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="location"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('location.label')}</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											placeholder={t('location.placeholder')}
											maxLength={200}
											className="pr-20"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={200} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="url"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t('url.label')}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t('url.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex space-x-4 flex-col sm:flex-row space-y-6">
						<FormField
							control={form.control}
							name="startDate"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>{t('startDate.label')}*</FormLabel>
									<FormControl>
										<Input
											{...field}
											value={isoToDatetimeLocal(field.value)}
											onChange={(e) => field.onChange(datetimeLocalToIso(e.target.value))}
											type="datetime-local"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="endDate"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>{t('endDate.label')}*</FormLabel>
									<FormControl>
										<Input
											{...field}
											value={isoToDatetimeLocal(field.value)}
											onChange={(e) => field.onChange(datetimeLocalToIso(e.target.value))}
											type="datetime-local"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
		</>
	);
};
