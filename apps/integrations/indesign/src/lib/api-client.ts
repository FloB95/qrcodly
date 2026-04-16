import type {
	TConfigTemplateResponseDto,
	TCreateQrCodeDto,
	TQrCodeOptions,
	TQrCodeWithRelationsResponseDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TTagResponseDto,
} from '@shared/schemas';
import qs from 'qs';

const DEFAULT_BASE_URL = 'https://api.qrcodly.de/api/v1';

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

type FetchOpts = {
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	body?: unknown;
};

export class QrcodlyApi {
	constructor(
		private readonly apiKey: string,
		private readonly baseUrl: string = DEFAULT_BASE_URL,
	) {}

	private async request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: opts.method ?? 'GET',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: opts.body ? JSON.stringify(opts.body) : undefined,
		});

		if (!response.ok) {
			let message = `Request failed: ${response.status}`;
			try {
				const payload = (await response.json()) as { message?: string };
				if (payload.message) message = payload.message;
			} catch {
				/* ignore parse error */
			}
			throw new ApiError(message, response.status);
		}

		return (await response.json()) as T;
	}

	listQrCodes(params: {
		page?: number;
		limit?: number;
		search?: string;
		tagIds?: string[];
	}): Promise<TQrCodeWithRelationsPaginatedResponseDto> {
		const queryParams: Record<string, unknown> = {
			page: params.page ?? 1,
			limit: params.limit ?? 20,
		};
		if (params.search) queryParams['where[name][like]'] = params.search;
		if (params.tagIds?.length) queryParams.tagIds = params.tagIds;

		const query = qs.stringify(queryParams, {
			addQueryPrefix: true,
			arrayFormat: 'repeat',
		});
		return this.request(`/qr-code${query}`);
	}

	createQrCode(dto: TCreateQrCodeDto): Promise<TQrCodeWithRelationsResponseDto> {
		return this.request('/qr-code', { method: 'POST', body: dto });
	}

	listTags(): Promise<{ data: TTagResponseDto[] }> {
		return this.request('/tag?page=1&limit=100');
	}

	listPredefinedTemplates(): Promise<{ data: TConfigTemplateResponseDto[] }> {
		return this.request('/config-template/predefined');
	}

	listMyTemplates(): Promise<{ data: TConfigTemplateResponseDto[] }> {
		return this.request('/config-template');
	}

	getReservedShortCode(): Promise<{ shortCode: string }> {
		return this.request('/short-url/reserved');
	}

	async renderQrPng(payload: {
		config: TQrCodeOptions;
		data: string;
		sizePx?: number;
	}): Promise<Blob> {
		return this.renderQr({ ...payload, format: 'png' }, (r) => r.blob());
	}

	async renderQrSvg(payload: { config: TQrCodeOptions; data: string }): Promise<string> {
		return this.renderQr({ ...payload, format: 'svg' }, (r) => r.text());
	}

	private async renderQr<T>(
		payload: { config: TQrCodeOptions; data: string; sizePx?: number; format: 'png' | 'svg' },
		extract: (r: Response) => Promise<T>,
	): Promise<T> {
		const response = await fetch(`${this.baseUrl}/qr-code/render`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			let message = `Render failed: ${response.status}`;
			try {
				const errPayload = (await response.json()) as { message?: string };
				if (errPayload.message) message = errPayload.message;
			} catch {
				/* binary response body, ignore */
			}
			throw new ApiError(message, response.status);
		}
		return extract(response);
	}
}

// UXP's runtime does not expose FileReader, so we read the blob via
// arrayBuffer() and base64-encode the bytes ourselves.
export async function blobToDataUrl(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = '';
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
	}
	const mime = blob.type || 'application/octet-stream';
	return `data:${mime};base64,${btoa(binary)}`;
}
