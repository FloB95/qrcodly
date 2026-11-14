import type {
	TConfigTemplateResponseDto,
	TCreateQrCodeDto,
	TQrCodeWithRelationsPaginatedResponseDto,
	TQrCodeWithRelationsResponseDto,
	TRenderQrCodeDto,
	TReservedShortUrlResponseDto,
	TTagResponseDto,
} from '@shared/schemas';
import { API_CLIENT_HEADER, formatApiClientHeader } from '@shared/schemas/utils/ApiClient';

// Injected at build time by build.mjs. Production → live API; dev →
// http://localhost:5001/api/v1; override via env var QRCODLY_API_URL.
declare const __QRCODLY_API_URL__: string;
declare const __QRCODLY_PLUGIN_VERSION__: string;

const API_CLIENT = formatApiClientHeader('figma', __QRCODLY_PLUGIN_VERSION__);

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

type RequestOptions = {
	method?: 'GET' | 'POST';
	body?: unknown;
};

export class QrcodlyApi {
	constructor(
		private readonly apiKey: string,
		private readonly baseUrl: string = __QRCODLY_API_URL__,
	) {}

	private async send(path: string, opts: RequestOptions = {}): Promise<Response> {
		const hasBody = opts.body !== undefined;
		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${path}`, {
				method: opts.method ?? 'GET',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					[API_CLIENT_HEADER]: API_CLIENT,
					...(hasBody ? { 'Content-Type': 'application/json' } : {}),
				},
				body: hasBody ? JSON.stringify(opts.body) : undefined,
			});
		} catch {
			throw new ApiError('Could not reach QRcodly. Check your internet connection.', 0);
		}

		if (!response.ok) {
			let message = `Request failed: ${response.status}`;
			try {
				const payload = (await response.json()) as { message?: string };
				if (payload.message) message = payload.message;
			} catch {
				/* binary or empty body */
			}
			throw new ApiError(message, response.status);
		}
		return response;
	}

	private async request<T>(path: string, opts?: RequestOptions): Promise<T> {
		return (await (await this.send(path, opts)).json()) as T;
	}

	listQrCodes(params: {
		page?: number;
		limit?: number;
		search?: string;
		tagIds?: string[];
	}): Promise<TQrCodeWithRelationsPaginatedResponseDto> {
		const query = new URLSearchParams({
			page: String(params.page ?? 1),
			limit: String(params.limit ?? 20),
		});
		if (params.search) query.set('where[name][like]', params.search);
		params.tagIds?.forEach((tagId) => query.append('tagIds', tagId));
		return this.request(`/qr-code?${query.toString()}`);
	}

	createQrCode(dto: TCreateQrCodeDto): Promise<TQrCodeWithRelationsResponseDto> {
		return this.request('/qr-code', { method: 'POST', body: dto });
	}

	listTags(): Promise<{ data: TTagResponseDto[] }> {
		return this.request('/tag?page=1&limit=100');
	}

	/**
	 * Cheapest authenticated call, used to reject a bad key while the user is still looking at the
	 * field. A 403 keeps the server's own message — it names the actual problem (missing scope,
	 * banned account), which "not accepted" would hide.
	 */
	async verifyKey(): Promise<void> {
		try {
			await this.request('/tag?page=1&limit=1');
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				throw new ApiError(
					'That key was not accepted. Copy it from qrcodly.de → Settings → API Keys.',
					error.status,
				);
			}
			throw error;
		}
	}

	listPredefinedTemplates(): Promise<{ data: TConfigTemplateResponseDto[] }> {
		return this.request('/config-template/predefined');
	}

	listMyTemplates(): Promise<{ data: TConfigTemplateResponseDto[] }> {
		return this.request('/config-template');
	}

	getReservedShortCode(): Promise<TReservedShortUrlResponseDto> {
		return this.request('/short-url/reserved');
	}

	async renderQr(payload: TRenderQrCodeDto): Promise<Blob> {
		return (await this.send('/qr-code/render', { method: 'POST', body: payload })).blob();
	}
}

// Figma's UI CSP allows data: images but not blob: URLs.
export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
		reader.readAsDataURL(blob);
	});
}
