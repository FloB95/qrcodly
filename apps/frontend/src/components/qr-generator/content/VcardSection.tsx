'use client';

import { memo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { VCardInputSchema, type TVCardInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';
import { HomeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

type FormValues = TVCardInput;

type VCardSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

const VCardSectionBase = ({ onChange, value }: VCardSectionProps) => {
	const t = useTranslations('generator.contentSwitch.vCard');

	// Map legacy fields to new fields for backwards compatibility
	const defaultValues: FormValues = {
		...value,
		phoneMobile: value.phoneMobile || value.phone,
		emailPrivate: value.emailPrivate || value.email,
	};

	const form = useForm<FormValues>({
		// @ts-expect-error VCardInputSchema has optional fields that conflict with resolver generic
		resolver: zodResolver(VCardInputSchema),
		defaultValues,
		shouldFocusError: false,
		shouldUnregister: true,
		reValidateMode: 'onBlur',
	});

	const watchedValues = useWatch({
		control: form.control,
	});
	const [debounced] = useDebouncedValue<FormValues>(watchedValues, 500);

	function onSubmit(values: FormValues) {
		const normalized = Object.fromEntries(
			Object.entries(values).map(([key, val]) => [key, val === '' ? undefined : val]),
		) as FormValues;

		const nextValue: FormValues = {
			...normalized,
			isDynamic: value.isDynamic,
		};

		if (JSON.stringify(nextValue) === JSON.stringify(value)) return;

		onChange(nextValue);
	}

	useEffect(() => {
		if (!debounced) return;
		if (JSON.stringify(debounced) === JSON.stringify(value)) return;

		// Use handleSubmit to trigger validation before updating
		void form.handleSubmit(onSubmit)();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem className="w-full sm:w-1/3 md:w-full lg:w-1/3">
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('title.label')}
								</span>
							</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										translate="no"
										placeholder={t('title.placeholder')}
										maxLength={32}
										className="pr-16"
									/>
									<InputGroupAddon align="inline-end">
										<CharacterCounter current={field.value?.length || 0} max={32} />
									</InputGroupAddon>
								</InputGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="block sm:flex sm:space-x-4 sm:flex-row space-y-6 sm:space-y-0">
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
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('firstName.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
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
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('lastName.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="block sm:flex sm:space-x-4 sm:flex-row space-y-6 sm:space-y-0">
					<FormField
						control={form.control}
						name="emailPrivate"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('emailPrivate.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('emailPrivate.placeholder')}
											maxLength={100}
											className="pr-20"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={100} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="emailBusiness"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('emailBusiness.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('emailBusiness.placeholder')}
											maxLength={100}
											className="pr-20"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={100} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-6">
					<FormField
						control={form.control}
						name="phonePrivate"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('phonePrivate.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('phonePrivate.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="phoneMobile"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('phoneMobile.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('phoneMobile.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="phoneBusiness"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('phoneBusiness.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Input {...field} translate="no" placeholder={t('phoneBusiness.placeholder')} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
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
				<div className="block sm:flex sm:space-x-4 sm:flex-row space-y-6 sm:space-y-0">
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
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('company.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
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
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('jobTitle.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
					<div className="flex items-center gap-2">
						<HomeIcon className="h-4 w-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold">
							<span translate="no" suppressHydrationWarning>
								{t('addressPrivate.title')}
							</span>
						</h3>
					</div>
					<FormField
						control={form.control}
						name="streetPrivate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('streetPrivate.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('streetPrivate.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<FormField
							control={form.control}
							name="cityPrivate"
							render={({ field }) => (
								<FormItem className="sm:col-span-2">
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('cityPrivate.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('cityPrivate.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="zipPrivate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('zipPrivate.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('zipPrivate.placeholder')}
												maxLength={10}
												className="pr-12"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={10} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="statePrivate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('statePrivate.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('statePrivate.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="countryPrivate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('countryPrivate.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('countryPrivate.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>
				<div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
					<div className="flex items-center gap-2">
						<BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
						<h3 className="text-sm font-semibold">
							<span translate="no" suppressHydrationWarning>
								{t('addressBusiness.title')}
							</span>
						</h3>
					</div>
					<FormField
						control={form.control}
						name="streetBusiness"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('streetBusiness.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											placeholder={t('streetBusiness.placeholder')}
											maxLength={64}
											className="pr-16"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={64} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<FormField
							control={form.control}
							name="cityBusiness"
							render={({ field }) => (
								<FormItem className="sm:col-span-2">
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('cityBusiness.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('cityBusiness.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="zipBusiness"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('zipBusiness.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('zipBusiness.placeholder')}
												maxLength={10}
												className="pr-12"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={10} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="stateBusiness"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('stateBusiness.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('stateBusiness.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="countryBusiness"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<span translate="no" suppressHydrationWarning>
											{t('countryBusiness.label')}
										</span>
									</FormLabel>
									<FormControl>
										<InputGroup>
											<InputGroupInput
												{...field}
												translate="no"
												placeholder={t('countryBusiness.placeholder')}
												maxLength={64}
												className="pr-16"
											/>
											<InputGroupAddon align="inline-end">
												<CharacterCounter current={field.value?.length || 0} max={64} />
											</InputGroupAddon>
										</InputGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>
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
				<FormField
					control={form.control}
					name="note"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('note.label')}
								</span>
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Textarea
										{...field}
										translate="no"
										placeholder={t('note.placeholder')}
										maxLength={300}
										className="resize-none pr-16"
										rows={3}
									/>
									<div className="absolute bottom-2 right-3">
										<CharacterCounter current={field.value?.length || 0} max={300} />
									</div>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};

// Custom equality function to prevent unnecessary re-renders
function areVCardPropsEqual(prev: VCardSectionProps, next: VCardSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

// Export memoized component
export const VCardSection = memo(VCardSectionBase, areVCardPropsEqual);
