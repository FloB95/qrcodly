import type {
	TConfigTemplateResponseDto,
	TCreateQrCodeDto,
	TQrCodeOptions,
	TQrCodeWithRelationsResponseDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TTagResponseDto,
} from '@shared/schemas';
import qs from 'qs';

const DEFAULT_BASE_URL = 'http://localhost:5001/api/v1';

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
		format?: 'png' | 'webp' | 'jpeg' | 'svg';
	}): Promise<Blob> {
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
				const err = (await response.json()) as { message?: string };
				if (err.message) message = err.message;
			} catch {
				// binary response body
			}
			throw new ApiError(message, response.status);
		}
		return await response.blob();
	}
}

// UXP's runtime ships neither FileReader nor URL.createObjectURL in a usable
// form, so we read the blob bytes ourselves and build the data URL manually.
function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		const slice = bytes.subarray(i, i + chunk);
		binary += String.fromCharCode.apply(null, Array.from(slice));
	}
	return btoa(binary);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
	const buf = await blob.arrayBuffer();
	const bytes = new Uint8Array(buf);
	const mime = blob.type || 'image/png';
	return `data:${mime};base64,${bytesToBase64(bytes)}`;
}
