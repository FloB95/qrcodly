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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { WifiInputSchema, type TWifiInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';

type FormValues = TWifiInput;

type WiFiSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

const _WiFiSection = ({ onChange, value }: WiFiSectionProps) => {
	const t = useTranslations('generator.contentSwitch.wifi');
	const form = useForm<FormValues>({
		resolver: zodResolver(WifiInputSchema),
		defaultValues: {
			ssid: value.ssid,
			password: value.password,
			encryption: value.encryption ?? 'WPA',
		},
	});

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	const watchedValues = useWatch({
		control: form.control,
	}) as FormValues;
	const [debounced] = useDebouncedValue<FormValues>(watchedValues, 500);

	useEffect(() => {
		if (!debounced?.ssid || debounced.ssid.length < 1) return;

		if (debounced.encryption === undefined) {
			form.setValue('encryption', 'WPA');
			return;
		}

		if (JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		// Use handleSubmit to trigger validation before updating
		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="ssid"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<span translate="no" suppressHydrationWarning>
									{t('network.label')}*
								</span>
							</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										translate="no"
										placeholder={t('network.placeholder')}
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
						name="password"
						disabled={form.getValues('encryption') === 'nopass'}
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('password.label')}
									</span>
								</FormLabel>
								<FormControl>
									<InputGroup>
										<InputGroupInput
											{...field}
											translate="no"
											autoCorrect="off"
											autoComplete="off"
											placeholder={t('password.placeholder')}
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
						name="encryption"
						render={({ field }) => (
							<FormItem className="w-full" translate="no">
								<FormLabel>
									<span translate="no" suppressHydrationWarning>
										{t('encryption.label')}
									</span>
								</FormLabel>
								<FormControl>
									<Select
										name="encryption"
										defaultValue="WPA"
										onValueChange={(value) => {
											form.setValue('encryption', value as TWifiInput['encryption']);

											if (value === 'nopass') {
												form.setValue('password', '');
											}
										}}
										value={field.value}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select the encryption type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="WPA">{t('encryption.optionLabelWpa')}</SelectItem>
											<SelectItem value="WEP">{t('encryption.optionLabelWep')}</SelectItem>
											<SelectItem value="nopass">{t('encryption.optionNoPass')}</SelectItem>
										</SelectContent>
									</Select>
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

// Custom equality function to prevent unnecessary re-renders
function areWiFiPropsEqual(prev: WiFiSectionProps, next: WiFiSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

// Export memoized component
export const WiFiSection = memo(_WiFiSection, areWiFiPropsEqual);
