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

type FormValues = TWifiInput;

type WiFiSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const WiFiSection = ({ onChange, value }: WiFiSectionProps) => {
	const t = useTranslations('generator.contentSwitch.wifi');
	const form = useForm<FormValues>({
		resolver: zodResolver(WifiInputSchema),
		defaultValues: {
			ssid: value.ssid,
			password: value.password,
			encryption: value.encryption ?? 'WPA',
		},
	});

	const [debounced] = useDebouncedValue<FormValues>(form.getValues(), 500);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	useEffect(() => {
		if (typeof debounced.encryption === 'undefined') {
			debounced.encryption = 'WPA';
		}

		if (
			JSON.stringify(debounced) === '{}' ||
			JSON.stringify(debounced) === JSON.stringify(value) ||
			typeof debounced.ssid === 'undefined'
		) {
			return;
		}

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
									{t('network.label')}
								</span>
							</FormLabel>
							<FormControl>
								<Input {...field} translate="no" placeholder={t('network.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
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
									<Input
										{...field}
										translate="no"
										autoCorrect="off"
										autoComplete="off"
										placeholder={t('password.placeholder')}
									/>
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
