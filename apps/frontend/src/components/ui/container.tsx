import { cn } from '@/lib/utils';

export default function Container({
	className = '',
	children,
	disableOverflow = false,
}: {
	className?: string;
	children: React.ReactNode;
	disableOverflow?: boolean;
}) {
	return (
		<div
			className={cn(
				'container relative mx-auto sm:px-6 lg:px-8 lg:max-w-[1400px]',
				// clip (not hidden) keeps sticky children working: hidden makes a scroll container
				!disableOverflow && 'overflow-x-clip',
				className,
			)}
		>
			{children}
		</div>
	);
}
