import { cn } from '@/lib/utils';

/** An illustrative QR code; it encodes nothing. */
export function QrGlyph({ size }: { size: number }) {
	return (
		<svg
			viewBox="0 0 29 29"
			width={size}
			height={size}
			shapeRendering="crispEdges"
			aria-hidden="true"
		>
			<rect width="29" height="29" fill="#fff" />
			<path fill="#0f172a" d="M0 0h7v7H0zM22 0h7v7h-7zM0 22h7v7H0z" />
			<path fill="#fff" d="M1 1h5v5H1zM23 1h5v5h-5zM1 23h5v5H1z" />
			<path
				fill="#0f172a"
				d="M2 2h3v3H2zM24 2h3v3h-3zM2 24h3v3H2zM9 1h2v1H9zM12 2h1v2h-1zM14 0h2v1h-2zM17 1h1v3h-1zM19 3h2v1h-2zM9 4h2v2H9zM14 4h1v1h-1zM8 8h3v1H8zM13 7h2v2h-2zM17 8h1v1h-1zM20 9h2v1h-2zM24 9h3v1h-3zM1 9h1v3H1zM4 10h2v1H4zM9 11h1v2H9zM12 11h3v1h-3zM16 12h2v2h-2zM21 12h1v3h-1zM25 12h2v1h-2zM3 13h3v1H3zM10 14h2v1h-2zM14 15h1v2h-1zM18 15h2v1h-2zM23 15h1v2h-1zM27 16h2v1h-2zM1 17h2v1H1zM6 16h1v3H6zM9 18h3v1H9zM16 18h1v1h-1zM20 18h3v1h-3zM11 20h1v2h-1zM14 21h2v1h-2zM18 21h1v3h-1zM22 22h3v3h-3zM26 21h2v1h-2zM9 23h2v1H9zM13 24h1v2h-1zM16 25h2v1h-2zM20 26h1v2h-1zM26 26h2v2h-2zM10 27h3v1h-3z"
			/>
		</svg>
	);
}

/** A metal type plate with the code on it, as printed on a machine. */
export function TypePlate({
	model,
	manufacturer,
	className,
}: {
	model: string;
	manufacturer: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'rounded-[18px] bg-gradient-to-br from-gray-200 via-slate-300 to-slate-400 p-5 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.8)]',
				className,
			)}
			aria-hidden="true"
		>
			<div className="flex items-center justify-between font-mono text-[11px] tracking-[0.1em] text-slate-700">
				<span>{manufacturer}</span>
				<span className="font-sans text-xl font-extrabold text-slate-900">CE</span>
			</div>
			<div className="mt-3.5 grid grid-cols-[1fr_108px] items-end gap-4">
				<div className="font-mono text-xs leading-[1.9] text-slate-800">
					<div>Typ&nbsp;&nbsp;&nbsp;{model}</div>
					<div>Nr.&nbsp;&nbsp;&nbsp;4711-0042</div>
					<div>Bj.&nbsp;&nbsp;&nbsp;2027</div>
					<div>400 V · 2,2 kW</div>
				</div>
				<div className="rounded-[10px] bg-white p-[7px] shadow-[0_0_0_2px_#0f172a]">
					<QrGlyph size={94} />
				</div>
			</div>
		</div>
	);
}
