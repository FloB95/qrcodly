import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { PasswordSection, SessionsSection } from '@/components/dashboard/security';
import { useTranslations } from 'next-intl';

export default function SettingsSecurityPage() {
	const t = useTranslations('settings.security');

	return (
		<div className="space-y-6">
			<Card className="@container/card">
				<CardContent className="relative">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary/10 rounded-lg">
							<ShieldCheckIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('title')}</CardTitle>
							<CardDescription>{t('description')}</CardDescription>
						</div>
					</div>
				</CardContent>
			</Card>

			<PasswordSection />
			<SessionsSection />
		</div>
	);
}
