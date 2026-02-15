'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { CharacterCounter } from '@/components/qr-generator/content/CharacterCounter';
import { useTranslations } from 'next-intl';
import { useUpdateTagMutation } from '@/lib/api/tag';
import { toast } from '@/components/ui/use-toast';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { TAG_NAME_MAX_LENGTH, type TTagResponseDto } from '@shared/schemas';
import type { ApiError } from '@/lib/api/ApiError';

const PRESET_COLORS = [
	'#EF4444',
	'#F97316',
	'#EAB308',
	'#22C55E',
	'#14B8A6',
	'#3B82F6',
	'#8B5CF6',
	'#EC4899',
];

type TagEditDialogProps = {
	tag: TTagResponseDto;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export const TagEditDialog = ({ tag, open, onOpenChange }: TagEditDialogProps) => {
	const t = useTranslations('tags');
	const [name, setName] = useState(tag.name);
	const [color, setColor] = useState(tag.color);
	const updateTag = useUpdateTagMutation();

	useEffect(() => {
		if (open) {
			setName(tag.name);
			setColor(tag.color);
		}
	}, [open, tag]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		try {
			await updateTag.mutateAsync({ id: tag.id, data: { name: name.trim(), color } });
			posthog.capture('tag-updated', { id: tag.id, name: name.trim(), color });
			toast({
				title: t('toast.updatedTitle'),
				description: t('toast.updatedDescription'),
				duration: 5000,
			});
			onOpenChange(false);
		} catch (e: unknown) {
			const error = e as ApiError;

			if (error.code >= 500) {
				Sentry.captureException(error, { extra: { id: tag.id, name: name.trim(), color } });
			}

			posthog.capture('error:tag-updated', {
				id: tag.id,
				error: { code: error.code, message: error.message },
			});

			toast({
				variant: 'destructive',
				title: t('toast.updateErrorTitle'),
				description: error.message,
				duration: 5000,
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('editBtn')}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-tag-name">{t('nameLabel')}</Label>
						<InputGroup>
							<InputGroupInput
								id="edit-tag-name"
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
						<Button type="submit" disabled={!name.trim() || updateTag.isPending}>
							{t('editBtn')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
