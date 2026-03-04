'use client';

import { TemplateList } from '@/components/dashboard/templates/TemplateList';
import { CreateTemplateDialog } from '@/components/dashboard/templates/CreateTemplateDialog';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function TemplatesPage() {
	const t = useTranslations();
	const [createTemplateOpen, setCreateTemplateOpen] = useState(false);

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<StarIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('collection.tabTemplates')}</CardTitle>
								<CardDescription>{t('templates.pageDescription')}</CardDescription>
							</div>
						</div>
						<Button
							onClick={() => setCreateTemplateOpen(true)}
							size="sm"
							className="self-end sm:self-auto gap-2"
						>
							<PlusIcon className="size-4" />
							<span className="sm:hidden lg:inline whitespace-nowrap">
								{t('collection.addTemplateBtn')}
							</span>
						</Button>
					</div>
				</CardContent>
			</Card>

			<TemplateList onCreateTemplate={() => setCreateTemplateOpen(true)} />

			<CreateTemplateDialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen} />
		</>
	);
}
