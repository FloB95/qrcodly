import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import type { DefaultPageParams } from '@/types/page';
import { ApiKeyList } from '@/components/dashboard/api-keys/ApiKeyList';
import { CreateApiKeyDialog } from '@/components/dashboard/api-keys/CreateApiKeyDialog';
import { ApiKeyProvider } from '@/components/dashboard/api-keys/ApiKeyContext';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'settings.apiKeys' });
	const user = await currentUser();

	if (!user) {
		return <></>;
	}

	return (
		<ApiKeyProvider userId={user.id}>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<CodeBracketIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>
									<div>{t('description')}</div>
								</CardDescription>
							</div>
						</div>
						<div>
							<CreateApiKeyDialog />
						</div>
					</div>
				</CardContent>
			</Card>

			<ApiKeyList />
		</ApiKeyProvider>
	);
}
