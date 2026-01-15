import { notFound } from 'next/navigation';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
		const response = await fetch(`${backendUrl}/qr-code/${id}/download`, {
			method: 'GET',
		});

		if (!response.ok) {
			if (response.status === 404) {
				return notFound();
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
		console.error('Error downloading QR code content:', err);
		return notFound();
	}
}
