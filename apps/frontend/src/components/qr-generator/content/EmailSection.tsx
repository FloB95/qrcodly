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
import {
	InputGroup,
	InputGroupInput,
	InputGroupAddon,
	InputGroupTextarea,
	InputGroupText,
} from '@/components/ui/input-group';
import { EmailInputSchema, type TEmailInput } from '@shared/schemas/src';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CharacterCounter } from './CharacterCounter';

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

	const formValues = form.watch();
	const [debounced] = useDebouncedValue<TEmailInput>(formValues, 500);

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
								<InputGroup>
									<InputGroupInput
										{...field}
										type="email"
										placeholder={t('email.placeholder')}
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
					name="subject"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('subject.label')}</FormLabel>
							<FormControl>
								<InputGroup>
									<InputGroupInput
										{...field}
										placeholder={t('subject.placeholder')}
										maxLength={250}
										className="pr-20"
									/>
									<InputGroupAddon align="inline-end">
										<CharacterCounter current={field.value?.length || 0} max={250} />
									</InputGroupAddon>
								</InputGroup>
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
								<InputGroup>
									<InputGroupTextarea
										{...field}
										placeholder={t('body.placeholder')}
										maxLength={1000}
									/>
									<InputGroupAddon align="block-end">
										<InputGroupText className="ml-auto">
											<CharacterCounter current={field.value?.length || 0} max={1000} />
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
