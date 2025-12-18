// @ts-nocheck

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
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { VCardInputSchema, type TVCardInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';

type FormValues = TVCardInput;

type VCardSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const VCardSection = ({ onChange, value }: VCardSectionProps) => {
	const t = useTranslations('generator.contentSwitch.vCard');
	const form = useForm<FormValues>({
		resolver: zodResolver(VCardInputSchema),
		defaultValues: value,
		shouldFocusError: false,
		shouldUnregister: true,
		reValidateMode: 'onBlur',
	});

	const [debounced] = useDebouncedValue(form.getValues(), 500);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	useEffect(() => {
		const processedDebounced = Object.fromEntries(
			Object.entries(debounced).map(([key, val]) => [key, val === '' ? undefined : val]),
		);

		if (
			JSON.stringify(processedDebounced) === '{}' ||
			JSON.stringify(processedDebounced) === JSON.stringify(value)
		)
			return;

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="firstName"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('firstName.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('firstName.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="lastName"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('lastName.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('lastName.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('email.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input {...field} translate="no" placeholder={t('email.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="phone"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('phone.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('phone.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="fax"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('fax.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('fax.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="company"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('company.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('company.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="job"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('jobTitle.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('jobTitle.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="street"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('street.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input {...field} translate="no" placeholder={t('street.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="city"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('city.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('city.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="zip"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('zipCode.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('zipCode.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="state"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('state.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input {...field} translate="no" placeholder={t('state.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="country"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('country.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input {...field} translate="no" placeholder={t('country.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="website"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('website.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									translate="no"
									placeholder={t('website.placeholder')}
									onBlur={(e) => {
										if (e.target.value === '') return;
										if (
											!e.target.value.startsWith('http://') &&
											!e.target.value.startsWith('https://')
										) {
											field.onChange(`https://${e.target.value}`);
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
