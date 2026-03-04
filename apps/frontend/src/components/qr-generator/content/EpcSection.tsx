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
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { EpcInputSchema, type TEpcInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';

type FormValues = TEpcInput;

type EpcSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

const _EpcSection = ({ onChange, value }: EpcSectionProps) => {
	const t = useTranslations('generator.contentSwitch.epc');

	const form = useForm<FormValues>({
		resolver: zodResolver(EpcInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});

	const watchedValues = useWatch({ control: form.control }) as FormValues;
	const [debounced] = useDebouncedValue<FormValues>(watchedValues, 500);

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		if (!debounced?.name || debounced.name.length < 1) return;
		if (!debounced?.iban || debounced.iban.length < 15) return;

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Beneficiary Name */}
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('name.label')}*
								</span>
							</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										translate="no"
										placeholder={t('name.placeholder')}
										maxLength={70}
										className="pr-16"
									/>
									<InputGroupAddon align="inline-end">
										<CharacterCounter current={field.value?.length || 0} max={70} />
									</InputGroupAddon>
								</InputGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* IBAN */}
				<FormField
					control={form.control}
					name="iban"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('iban.label')}*
								</span>
							</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										translate="no"
										placeholder={t('iban.placeholder')}
										maxLength={34}
										className="pr-16 uppercase"
										onChange={(e) => {
											field.onChange(e.target.value.toUpperCase());
										}}
									/>
									<InputGroupAddon align="inline-end">
										<CharacterCounter
											current={field.value?.replace(/\s/g, '').length || 0}
											max={34}
										/>
									</InputGroupAddon>
								</InputGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* BIC and Amount row */}
				<div className="block sm:flex sm:space-x-4 sm:flex-row space-y-6 sm:space-y-0">
					{/* BIC */}
					<FormField
						control={form.control}
						name="bic"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('bic.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											value={field.value ?? ''}
											translate="no"
											placeholder={t('bic.placeholder')}
											maxLength={11}
											className="pr-16 uppercase"
											onChange={(e) => {
												field.onChange(e.target.value.toUpperCase());
											}}
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={11} />
										</InputGroupAddon>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Amount */}
					<FormField
						control={form.control}
						name="amount"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('amount.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupAddon align="inline-start">EUR</InputGroupAddon>
										<InputGroupInput
											{...field}
											type="number"
											step="0.01"
											min="0.01"
											max="999999999.99"
											translate="no"
											placeholder={t('amount.placeholder')}
											value={field.value ?? ''}
											onChange={(e) => {
												const val = e.target.value;
												const normalized = val.replace(',', '.');
												field.onChange(normalized === '' ? undefined : parseFloat(normalized));
											}}
										/>
									</InputGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/* Purpose (Remittance Information) */}
				<FormField
					control={form.control}
					name="purpose"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('purpose.label')}
								</span>
							</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										value={field.value ?? ''}
										translate="no"
										placeholder={t('purpose.placeholder')}
										maxLength={140}
										className="pr-16"
									/>
									<InputGroupAddon align="inline-end">
										<CharacterCounter current={field.value?.length || 0} max={140} />
									</InputGroupAddon>
								</InputGroup>
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
function areEpcPropsEqual(prev: EpcSectionProps, next: EpcSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

// Export memoized component
export const EpcSection = memo(_EpcSection, areEpcPropsEqual);
