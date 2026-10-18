import { serverApiUrl } from '@/lib/server-api-url';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		const response = await fetch(`${serverApiUrl()}/qr-code/${id}/download`, {
			method: 'GET',
		});

		if (!response.ok) {
			if (response.status === 404) {
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
		return new Response('QR code not found', { status: 404 });
	}
}
