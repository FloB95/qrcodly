import Container from './ui/container';
import Link from 'next/link';
import { QrcodlyLogo } from './QrcodlyLogo';

export default function NoNavHeader() {
	return (
		<header className="pt-10">
			<Container>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<Link href="/" title="QRcodly">
						<QrcodlyLogo size="lg" />
					</Link>
				</div>
			</Container>
		</header>
	);
}
