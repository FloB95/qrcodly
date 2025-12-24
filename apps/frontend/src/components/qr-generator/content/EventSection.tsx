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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect } from 'react';
import { EventInputSchema, type TEventInput } from '@shared/schemas/src';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

type EventSectionProps = {
	onChange: (data: TEventInput) => void;
	value: TEventInput;
};

export const EventSection = ({ onChange, value }: EventSectionProps) => {
	const t = useTranslations('generator.contentSwitch.event');

	const form = useForm<TEventInput>({
		resolver: zodResolver(EventInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});

	const [debounced] = useDebouncedValue<TEventInput>(form.getValues(), 500);

	function onSubmit(values: TEventInput) {
		onChange(values);
	}

	useEffect(() => {
		if (
			JSON.stringify(debounced) === '{}' ||
			JSON.stringify(debounced) === JSON.stringify(value) ||
			debounced.startDate === '' ||
			debounced.endDate === ''
		) {
			return;
		}

		console.log(JSON.stringify(debounced), JSON.stringify(value));

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('title.label')}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t('title.placeholder')} />
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
								<Input {...field} placeholder={t('description.placeholder')} />
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
								<Input {...field} placeholder={t('location.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="startDate"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t('startDate.label')}</FormLabel>
								<FormControl>
									<Input {...field} type="datetime-local" />
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
								<FormLabel>{t('endDate.label')}</FormLabel>
								<FormControl>
									<Input {...field} type="datetime-local" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</form>
		</Form>
	);
};
