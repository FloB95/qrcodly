'use client';

import { memo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { PhoneInputSchema, type TPhoneInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';

type PhoneSectionProps = {
	onChange: (data: TPhoneInput) => void;
	value: TPhoneInput;
};

const countDigits = (value?: string) => (value ?? '').replace(/\D/g, '').length;

const PhoneSectionBase = ({ onChange, value }: PhoneSectionProps) => {
	const t = useTranslations('generator.contentSwitch.phone');

	const form = useForm<TPhoneInput>({
		resolver: zodResolver(PhoneInputSchema),
		defaultValues: value,
		shouldFocusError: false,
		mode: 'onTouched',
	});

	const watchedValues = useWatch({ control: form.control }) as TPhoneInput;
	const [debounced] = useDebouncedValue<TPhoneInput>(watchedValues, 500);

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		// Wait for a plausible number before validating so half-typed input shows no error yet.
		if (countDigits(debounced?.phone) < 3) return;

		void form.handleSubmit(onSubmit)();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	function onSubmit(values: TPhoneInput) {
		onChange(values);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('phone.label')}*
								</span>
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="tel"
									translate="no"
									placeholder={t('phone.placeholder')}
									maxLength={32}
								/>
							</FormControl>
							<FormDescription className="-mt-2">{t('phone.hint')}</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};

// Custom equality function to prevent unnecessary re-renders
function arePhonePropsEqual(prev: PhoneSectionProps, next: PhoneSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const PhoneSection = memo(PhoneSectionBase, arePhonePropsEqual);
