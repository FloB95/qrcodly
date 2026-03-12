import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

const sizeClasses = {
	hero: 'text-4xl sm:text-5xl lg:text-6xl',
	lg: 'text-3xl sm:text-4xl lg:text-5xl',
	section: 'text-3xl sm:text-4xl',
	md: 'text-2xl sm:text-3xl lg:text-4xl',
	sm: 'text-xl sm:text-2xl',
	xs: 'text-lg sm:text-xl',
} as const;

export type HeadingSize = keyof typeof sizeClasses;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
	as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	size?: HeadingSize;
}

export function Heading({
	as: Tag = 'h2',
	size = 'section',
	className,
	children,
	...props
}: HeadingProps) {
	return (
		<Tag
			className={cn('font-semibold tracking-tight text-slate-900', sizeClasses[size], className)}
			{...props}
		>
			{children}
		</Tag>
	);
}
