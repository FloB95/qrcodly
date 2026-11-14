'use client';

import { memo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea,
} from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SmsInputSchema, type TSmsInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';

type SmsSectionProps = {
	onChange: (data: TSmsInput) => void;
	value: TSmsInput;
};

const countDigits = (value?: string) => (value ?? '').replace(/\D/g, '').length;

const SmsSectionBase = ({ onChange, value }: SmsSectionProps) => {
	const t = useTranslations('generator.contentSwitch.sms');

	const form = useForm<TSmsInput>({
		resolver: zodResolver(SmsInputSchema),
		defaultValues: value,
		shouldFocusError: false,
		mode: 'onTouched',
	});

	const watchedValues = useWatch({ control: form.control }) as TSmsInput;
	const [debounced] = useDebouncedValue<TSmsInput>(watchedValues, 500);

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		if (countDigits(debounced?.phone) < 3) return;

		void form.handleSubmit(onSubmit)();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	function onSubmit(values: TSmsInput) {
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
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="message"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('message.label')}</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupTextarea
										{...field}
										value={field.value ?? ''}
										placeholder={t('message.placeholder')}
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
			</form>
		</Form>
	);
};

// Custom equality function to prevent unnecessary re-renders
function areSmsPropsEqual(prev: SmsSectionProps, next: SmsSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const SmsSection = memo(SmsSectionBase, areSmsPropsEqual);
