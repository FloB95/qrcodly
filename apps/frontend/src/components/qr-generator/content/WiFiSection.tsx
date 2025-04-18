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
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { WifiInputSchema, type TWifiInput } from '@shared/schemas/src';
// Import from the shared package

type FormValues = TWifiInput;

type WiFiSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const WiFiSection = ({ onChange, value }: WiFiSectionProps) => {
	const form = useForm<FormValues>({
		resolver: zodResolver(WifiInputSchema),
		defaultValues: {
			ssid: value?.ssid,
			password: value?.password,
			encryption: value?.encryption || 'WPA',
		},
	});

	const [debounced] = useDebouncedValue<FormValues>(form.getValues(), 500);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	// handle submit automatically after debounced value
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
							<FormLabel>Network</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Enter your network name" />
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
								<FormLabel>Password</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoCorrect="off"
										autoComplete="off"
										placeholder="Enter your password"
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
							<FormItem className="w-full">
								<FormLabel>Encryption</FormLabel>
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
											<SelectItem value="WPA">WPA/WPA2</SelectItem>
											<SelectItem value="WEP">WEP</SelectItem>
											<SelectItem value="nopass">no password</SelectItem>
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
