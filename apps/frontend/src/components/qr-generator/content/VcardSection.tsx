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
import { VCardInputSchema, type TVCardInput } from 'qrcodly-api-types';

type FormValues = TVCardInput;

type VcardSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const VcardSection = ({ onChange, value }: VcardSectionProps) => {
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

	// handle submit automatically after debounced value
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
								<FormLabel>First Name</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your first name" />
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
								<FormLabel>Last Name</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your last name" />
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
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Enter your email" />
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
								<FormLabel>Phone</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your phone number" />
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
								<FormLabel>Fax</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your fax number" />
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
								<FormLabel>Company</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your company name" />
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
								<FormLabel>Job Title</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your job title" />
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
							<FormLabel>Street</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Enter your street address" />
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
								<FormLabel>City</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your city" />
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
								<FormLabel>Zip Code</FormLabel>
								<FormControl>
									<Input {...field} placeholder="Enter your zip code" />
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
							<FormLabel>State</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Enter your state" />
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
							<FormLabel>Country</FormLabel>
							<FormControl>
								<Input {...field} placeholder="Enter your country" />
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
							<FormLabel>Website</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="Enter your website URL"
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
