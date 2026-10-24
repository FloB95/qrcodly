import { serverApiUrl } from '@/lib/server-api-url';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		const response = await fetch(`${serverApiUrl()}/qr-code/${id}/download`, {
			method: 'GET',
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			// Permanent answers stay "not found"; only outages (5xx, 429) fall through to the retry page
			if (response.status < 500 && response.status !== 429) {
				return new Response('QR code not found', { status: 404 });
			}
			throw new Error(`Failed to download QR code content: ${response.statusText}`);
		}

		const content = await response.arrayBuffer();
		const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
		const contentDisposition = response.headers.get('Content-Disposition') || '';

		return new Response(content, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': contentDisposition,
			},
		});
	} catch (err) {
		console.error('Error downloading QR code content:', err, {
			qrCodeId: id,
		});
		// Backend briefly unreachable: the scanned vCard/event code itself is fine
		return new Response('Please scan again in a few seconds.', {
			status: 503,
			headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
		});
	}
}
