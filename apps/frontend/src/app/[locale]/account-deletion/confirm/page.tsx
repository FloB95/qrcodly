import { ConfirmAccountDeletion } from '@/components/account-deletion/ConfirmAccountDeletion';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Reached only through the link in the confirmation mail.
export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'accountDeletionConfirm' });
	return { title: t('title'), robots: { index: false, follow: false } };
}

export default function ConfirmAccountDeletionPage() {
	return (
		<div className="mt-24 flex h-full w-full flex-1 flex-col items-center justify-center pb-24">
			<Container>
				<ConfirmAccountDeletion />
			</Container>
		</div>
	);
}
