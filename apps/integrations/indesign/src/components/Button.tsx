import type { KeyboardEvent, ReactNode } from 'react';

type Props = {
	onClick?: () => void;
	disabled?: boolean;
	variant?: 'default' | 'primary' | 'danger';
	className?: string;
	children: ReactNode;
	title?: string;
};

export function Button({
	onClick,
	disabled,
	variant = 'default',
	className = '',
	children,
	title,
}: Props) {
	const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick?.();
		}
	};

	const variantClass =
		variant === 'primary' ? 'btn primary' : variant === 'danger' ? 'btn danger' : 'btn';

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			className={`${variantClass}${disabled ? ' is-disabled' : ''}${className ? ' ' + className : ''}`}
			onClick={disabled ? undefined : onClick}
			onKeyDown={handleKey}
			title={title}
		>
			{children}
		</div>
	);
}
