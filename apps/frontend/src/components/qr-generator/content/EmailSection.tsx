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
import { EmailInputSchema, type TEmailInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from '@/components/ui/textarea';

type EmailSectionProps = {
	onChange: (data: TEmailInput) => void;
	value: TEmailInput;
};

export const EmailSection = ({ onChange, value }: EmailSectionProps) => {
	const t = useTranslations('generator.contentSwitch.email');

	const form = useForm<TEmailInput>({
		resolver: zodResolver(EmailInputSchema),
		defaultValues: {
			email: value.email,
			subject: value.subject,
			body: value.body,
		},
		shouldFocusError: false,
	});

	const [debounced] = useDebouncedValue<TEmailInput>(form.getValues(), 500);

	function onSubmit(values: TEmailInput) {
		onChange(values);
	}

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('email.label')}*</FormLabel>
							<FormControl>
								<Input {...field} type="email" placeholder={t('email.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="subject"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('subject.label')}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t('subject.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="body"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('body.label')}</FormLabel>
							<FormControl>
								<Textarea {...field} placeholder={t('body.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};
