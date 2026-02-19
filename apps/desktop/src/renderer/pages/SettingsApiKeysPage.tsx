import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { useUser } from '@clerk/clerk-react';
import { ApiKeyList } from '@/components/dashboard/api-keys/ApiKeyList';
import { CreateApiKeyDialog } from '@/components/dashboard/api-keys/CreateApiKeyDialog';
import { ApiKeyProvider } from '@/components/dashboard/api-keys/ApiKeyContext';
import { Loader } from '@/components/ui/loader';

export default function SettingsApiKeysPage() {
	const t = useTranslations('settings.apiKeys');
	const { user, isLoaded } = useUser();

	if (!isLoaded) {
		return <Loader />;
	}

	if (!user) {
		return null;
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
