import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFoundPage() {
	const t = useTranslations('general');

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
			<h1 className="text-4xl font-bold">404</h1>
			<p className="text-muted-foreground">Page not found</p>
			<Link
				href="/dashboard/qr-codes"
				className="text-primary underline underline-offset-4 hover:text-primary/80"
			>
				{t('back')}
			</Link>
		</div>
	);
}
