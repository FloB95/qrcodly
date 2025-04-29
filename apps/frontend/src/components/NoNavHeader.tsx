import Container from './ui/container';
import Link from 'next/link';

export default function NoNavHeader() {
	return (
		<header className="pt-10">
			<Container>
				<div className="flex justify-between pt-1 sm:px-6 lg:px-8">
					<div className="text-3xl font-bold">
						<Link href="/" title="QRcodly">
							QRcodly
						</Link>
					</div>
				</div>
			</Container>
		</header>
	);
}
