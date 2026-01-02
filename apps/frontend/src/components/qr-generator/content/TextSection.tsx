'use client';

import { memo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { TextInputSchema } from '@shared/schemas';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';

type TTextSectionProps = {
	value: string;
	onChange: (e: string) => void;
};

const formSchema = z.object({
	text: TextInputSchema,
});

import { useWatch } from 'react-hook-form';

const _TextSection = ({ value, onChange }: TTextSectionProps) => {
	const t = useTranslations('generator.contentSwitch');

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			text: value,
		},
	});

	const watchedText = useWatch({
		control: form.control,
		name: 'text',
	});

	const [debounced] = useDebouncedValue(watchedText, 500);

	useEffect(() => {
		if (debounced === undefined) return;
		if (debounced === value) return;

		onChange(debounced);
	}, [debounced, value, onChange]);

	return (
		<Form {...form}>
			<form>
				<FormField
					control={form.control}
					name="text"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								<p
									className="first-letter:uppercase lowercase"
									translate="no"
									suppressHydrationWarning
								>
									{t('tab.text')}*
								</p>
							</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									autoFocus
									maxLength={1000}
									placeholder={t('text.placeholder')}
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

// Custom equality function to prevent unnecessary re-renders
function areTextPropsEqual(prev: TTextSectionProps, next: TTextSectionProps) {
	return prev.value === next.value && prev.onChange === next.onChange;
}

// Export memoized component
export const TextSection = memo(_TextSection, areTextPropsEqual);
