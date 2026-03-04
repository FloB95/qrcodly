'use client';

import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';

export default function TextContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	if (qrCode.content.type !== 'text') return null;

	const text = qrCode.content.data;

	return (
		<>
			<div className="mt-4">
				<div className="p-4 bg-muted/50 rounded-lg border">
					<p className="whitespace-pre-wrap break-words text-base">{text}</p>
				</div>
				<div className="mt-2 text-sm text-muted-foreground">
					{text.length} {text.length === 1 ? 'character' : 'characters'}
				</div>
			</div>
		</>
	);
}
