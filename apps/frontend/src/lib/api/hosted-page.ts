import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
	API_CLIENT_HEADER,
	type THostedAssetUrlsResponseDto,
	type THostedPageUsageResponseDto,
	type THostedUploadKind,
	type THostedUploadResponseDto,
	type TPublicHostedPageResponseDto,
} from '@shared/schemas';
import { env } from '@/env';
import { API_CLIENT } from '@/lib/api-client-header';
import { ApiError } from './ApiError';

// Mirrors HOSTED_PAGE_PLAN_LIMITS in apps/backend/src/core/config/plan.config.ts
export const HOSTED_PAGE_LIMITS = {
	pro: {
		maxLandingPages: 15,
		maxFiles: 60,
		maxFileSizeBytes: { pdf: 50 * 1024 * 1024, image: 2 * 1024 * 1024 },
	},
} as const;

export const hostedPageQueryKeys = {
	all: ['hosted-page'] as const,
	publicPage: (shortCode: string) => ['hosted-page', shortCode] as const,
	usage: ['hosted-page-usage'] as const,
	usageExcluding: (qrCodeId: string | null) => ['hosted-page-usage', qrCodeId] as const,
	assetUrls: (keys: string[]) => ['hosted-page-assets', ...keys] as const,
};

/** Multipart upload through XMLHttpRequest, the only way to get upload progress in the browser. */
export function uploadHostedFile(
	file: File,
	kind: THostedUploadKind,
	token: string,
	onProgress?: (percent: number) => void,
): Promise<THostedUploadResponseDto> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', `${env.NEXT_PUBLIC_API_URL}/hosted-page/upload`);
		xhr.setRequestHeader('Authorization', `Bearer ${token}`);
		if (API_CLIENT) xhr.setRequestHeader(API_CLIENT_HEADER, API_CLIENT);

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
		};
		xhr.onerror = () => reject(new ApiError('Could not connect to the server.', 0));
		xhr.onload = () => {
			let body: Record<string, unknown> = {};
			try {
				body = JSON.parse(xhr.responseText) as Record<string, unknown>;
			} catch {}
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(body as unknown as THostedUploadResponseDto);
				return;
			}
			reject(
				new ApiError(
					(body.message as string | undefined) ?? 'Upload failed',
					xhr.status,
					undefined,
					body.errorCode as string | undefined,
				),
			);
		};

		const formData = new FormData();
		formData.append('kind', kind);
		formData.append('file', file);
		xhr.send(formData);
	});
}

const UPLOAD_BUSY_RETRY_DELAYS_MS = [2000, 5000, 10000];

// the backend holds only a few large uploads in memory at once, so files go up one after another
let uploadQueue: Promise<unknown> = Promise.resolve();

function enqueueUpload<T>(task: () => Promise<T>): Promise<T> {
	const run = uploadQueue.then(task);
	uploadQueue = run.catch(() => undefined);
	return run;
}

export function useUploadHostedFileMutation() {
	const { getToken } = useAuth();

	return useMutation({
		mutationFn: ({
			file,
			kind,
			onProgress,
		}: {
			file: File;
			kind: THostedUploadKind;
			onProgress?: (percent: number) => void;
		}) =>
			enqueueUpload(async () => {
				for (let attempt = 0; ; attempt++) {
					// fetched per attempt: a token taken before the wait in the queue would have expired
					const token = await getToken();
					if (!token) throw new ApiError('You need to be logged in to upload files', 401);
					try {
						return await uploadHostedFile(file, kind, token, onProgress);
					} catch (error) {
						const delay = UPLOAD_BUSY_RETRY_DELAYS_MS[attempt];
						// 429: other uploads fill the server's memory budget right now
						if (!(error instanceof ApiError) || error.code !== 429 || delay === undefined) {
							throw error;
						}
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
			}),
	});
}

export type PublicHostedPageResult =
	| { status: 'ok'; page: TPublicHostedPageResponseDto }
	| { status: 'disabled' }
	| { status: 'blocked' }
	| { status: 'not_found' }
	/** Rate limit or backend outage: a printed code must not read "not found" meanwhile */
	| { status: 'unavailable' };

const LOOKUP_TIMEOUT_MS = 5000;

/** Public page lookup; works in server components (pass serverApiUrl()) and in the browser. */
export async function getPublicHostedPage(
	shortCode: string,
	apiUrl: string,
	headers?: Record<string, string>,
): Promise<PublicHostedPageResult> {
	let response: Response;
	try {
		response = await fetch(`${apiUrl}/hosted-page/by-code/${encodeURIComponent(shortCode)}`, {
			method: 'GET',
			cache: 'no-store',
			headers,
			signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
		});
	} catch {
		return { status: 'unavailable' };
	}

	if (response.ok) {
		return { status: 'ok', page: (await response.json()) as TPublicHostedPageResponseDto };
	}

	const body = (await response.json().catch(() => ({}))) as { errorCode?: string };
	if (body.errorCode === 'HOSTED_PAGE_DISABLED') return { status: 'disabled' };
	if (body.errorCode === 'HOSTED_PAGE_BLOCKED') return { status: 'blocked' };
	if (response.status === 404) return { status: 'not_found' };
	return { status: 'unavailable' };
}

/** The live page payload, used by the dashboard preview. */
export function usePublicHostedPageQuery(shortCode: string | undefined) {
	return useQuery({
		queryKey: hostedPageQueryKeys.publicPage(shortCode ?? ''),
		queryFn: () => getPublicHostedPage(shortCode!, env.NEXT_PUBLIC_API_URL),
		enabled: !!shortCode,
		staleTime: 30 * 1000,
		retry: 1,
	});
}

/**
 * Public URLs of the caller's own images by storage key, for the editor of a saved page. Comes
 * from the owner's account, so a page that is switched off or offline still shows its images.
 */
export function useHostedAssetUrlsQuery(keys: string[]) {
	const { getToken, isSignedIn } = useAuth();
	return useQuery({
		queryKey: hostedPageQueryKeys.assetUrls(keys),
		queryFn: async (): Promise<THostedAssetUrlsResponseDto> => {
			const token = await getToken();
			const query = encodeURIComponent(keys.join(','));
			const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/hosted-page/assets?keys=${query}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					...(API_CLIENT ? { [API_CLIENT_HEADER]: API_CLIENT } : {}),
				},
			});
			if (!response.ok) throw new ApiError('Failed to load image URLs', response.status);
			return (await response.json()) as THostedAssetUrlsResponseDto;
		},
		enabled: isSignedIn === true && keys.length > 0,
		// image URLs never change for a key
		staleTime: Infinity,
		retry: 2,
	});
}

/** Pages used and allowed on the caller's plan, refreshed whenever the editor opens. */
/** `excludeQrCodeId` leaves out the code being edited, so the editor can add its draft instead. */
export function useHostedPageUsageQuery(excludeQrCodeId: string | null = null) {
	const { getToken, isSignedIn } = useAuth();
	return useQuery({
		queryKey: hostedPageQueryKeys.usageExcluding(excludeQrCodeId),
		queryFn: async (): Promise<THostedPageUsageResponseDto> => {
			const token = await getToken();
			const query = excludeQrCodeId
				? `?excludeQrCodeId=${encodeURIComponent(excludeQrCodeId)}`
				: '';
			const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/hosted-page/usage${query}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					...(API_CLIENT ? { [API_CLIENT_HEADER]: API_CLIENT } : {}),
				},
			});
			if (!response.ok) throw new ApiError('Failed to load hosted page usage', response.status);
			return (await response.json()) as THostedPageUsageResponseDto;
		},
		enabled: isSignedIn === true,
		staleTime: 0,
		refetchOnMount: 'always',
		retry: 1,
	});
}
