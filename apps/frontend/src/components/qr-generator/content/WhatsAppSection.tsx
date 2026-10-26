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
import {
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea,
} from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { WhatsAppInputSchema, type TWhatsAppInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';

type WhatsAppSectionProps = {
	onChange: (data: TWhatsAppInput) => void;
	value: TWhatsAppInput;
};

const countDigits = (value?: string) => (value ?? '').replace(/\D/g, '').length;

const WhatsAppSectionBase = ({ onChange, value }: WhatsAppSectionProps) => {
	const t = useTranslations('generator.contentSwitch.whatsapp');

	const form = useForm<TWhatsAppInput>({
		resolver: zodResolver(WhatsAppInputSchema),
		defaultValues: value,
		shouldFocusError: false,
		mode: 'onTouched',
	});

	const watchedValues = useWatch({ control: form.control }) as TWhatsAppInput;
	const [debounced] = useDebouncedValue<TWhatsAppInput>(watchedValues, 500);

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		// A country code plus subscriber number is at least 7 digits; validate once that much is typed.
		if (countDigits(debounced?.phone) < 7) return;

		void form.handleSubmit(onSubmit)();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debounced]);

	function onSubmit(values: TWhatsAppInput) {
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
function areWhatsAppPropsEqual(prev: WhatsAppSectionProps, next: WhatsAppSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

export const WhatsAppSection = memo(WhatsAppSectionBase, areWhatsAppPropsEqual);
