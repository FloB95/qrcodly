'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { CharacterCounter } from '@/components/qr-generator/content/CharacterCounter';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useCreateTagMutation } from '@/lib/api/tag';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { TAG_NAME_MAX_LENGTH } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';

const PRESET_COLORS: string[] = [
	'#EF4444',
	'#F97316',
	'#EAB308',
	'#22C55E',
	'#14B8A6',
	'#3B82F6',
	'#8B5CF6',
	'#EC4899',
];

export const TagCreateDialog = () => {
	const t = useTranslations('tags');
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [color, setColor] = useState(PRESET_COLORS[0] ?? '#3B82F6');
	const createTag = useCreateTagMutation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		try {
			await createTag.mutateAsync({ name: name.trim(), color });
			posthog.capture('tag-created', { name: name.trim(), color });
			toast({
				title: t('toast.createdTitle'),
				description: t('toast.createdDescription'),
				duration: 5000,
			});
			setOpen(false);
			setName('');
			setColor(PRESET_COLORS[0] ?? '#3B82F6');
		} catch (e: unknown) {
			const error = e as ApiError;

			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { name: name.trim(), color } });
			}

			posthog.capture('error:tag-created', {
				error: { code: error.code, message: error.message },
			});

			toast({
				variant: 'destructive',
				title: t('toast.createErrorTitle'),
				description: error.message,
				duration: 5000,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2">
					<PlusIcon className="size-4" />
					<span className="sm:hidden lg:inline whitespace-nowrap">{t('createBtn')}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('createBtn')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="tag-name">{t('nameLabel')}</Label>
						<InputGroup>
							<InputGroupInput
								id="tag-name"
								value={name}
								onChange={(e) => setName(e.target.value.slice(0, TAG_NAME_MAX_LENGTH))}
								placeholder={t('nameLabel')}
								maxLength={TAG_NAME_MAX_LENGTH}
								autoFocus
							/>
							<InputGroupAddon align="inline-end">
								<CharacterCounter current={name.length} max={TAG_NAME_MAX_LENGTH} />
							</InputGroupAddon>
						</InputGroup>
					</div>
					<div className="space-y-2">
						<Label>{t('colorLabel')}</Label>
						<div className="flex flex-wrap gap-2">
							{PRESET_COLORS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setColor(c)}
									className="size-8 rounded-full border-2 transition-all"
									style={{
										backgroundColor: c,
										borderColor: color === c ? '#000' : 'transparent',
										transform: color === c ? 'scale(1.15)' : 'scale(1)',
									}}
								/>
							))}
							<Input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="size-8 p-0 border-0 cursor-pointer rounded-full overflow-hidden"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={!name.trim() || createTag.isPending}>
							{t('createBtn')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
