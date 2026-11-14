import { z } from 'zod';
import { Readable } from 'node:stream';
import { Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { inject, injectable } from 'tsyringe';
import { internalApiAuthHandler } from '@/core/http/middleware/internal-api-auth.middleware';
import { TokenTypeSchema } from '@/core/domain/schema/UserSchema';
import { DEFAULT_ERROR_RESPONSES } from '@/core/error/http/error.schemas';
import { RateLimitPolicy } from '@/core/rate-limit/rate-limit.policy';
import {
	HostedAssetUrlsRequestQueryDto,
	HostedAssetUrlsResponseDto,
	type THostedAssetUrlsRequestQueryDto,
	type THostedAssetUrlsResponseDto,
	HostedUploadDto,
	HostedUploadResponseDto,
	PublicHostedPageResponseDto,
	type THostedUploadDto,
	type THostedUploadResponseDto,
	type TPublicHostedPageResponseDto,
} from '@shared/schemas';
import { UploadHostedFileUseCase } from '../../useCase/upload-hosted-file.use-case';
import { GetPublicHostedPageUseCase } from '../../useCase/get-public-hosted-page.use-case';
import { GetHostedFileUseCase } from '../../useCase/get-hosted-file.use-case';
import { GetHostedAssetUrlsUseCase } from '../../useCase/get-hosted-asset-urls.use-case';
import { DownloadService } from '@/modules/qr-code/service/download.service';
import { HOSTED_UPLOAD_HARD_LIMIT_BYTES } from '@/modules/hosted-page/config/constants';
import { parseByteRange } from '@/core/http/byte-range';
import { holdingUploadSlot, hostedUploadGuard } from '../hosted-upload.guard';

const HostedFileQuerySchema = z.object({
	download: z.string().optional().describe('Set to 1 to download instead of opening inline'),
});
type THostedFileQuery = z.infer<typeof HostedFileQuerySchema>;
type TShortCodeParams = { shortCode: string };
type TFileParams = TShortCodeParams & { documentId: string };

/**
 * Files are served by the frontend under the page's own address, which proxies this route. They
 * open in the browser's own viewer and are never embedded, not even by their page.
 */
const FILE_POLICY_HEADERS = {
	'Content-Security-Policy': "frame-ancestors 'none'",
	'Cross-Origin-Resource-Policy': 'same-origin',
	'X-Content-Type-Options': 'nosniff',
	// search engines index PDFs by default; the page itself is noindex as well
	'X-Robots-Tag': 'noindex, nofollow, noarchive',
	// the URL stays the same when the owner swaps the file, and a blocked or offline page must stop
	// at once: browsers revalidate every time (a cheap 304 by ETag), shared caches keep nothing
	'Cache-Control': 'private, no-cache',
} as const;

/** Hosted pages stay out of the public API docs, but API keys keep working. */
const UNDOCUMENTED = { hide: true } as const;
const ANY_TOKEN_TYPE = [...TokenTypeSchema.options];

@injectable()
export class HostedPageController extends AbstractController {
	constructor(
		@inject(UploadHostedFileUseCase) private readonly uploadUseCase: UploadHostedFileUseCase,
		@inject(GetPublicHostedPageUseCase)
		private readonly getPublicHostedPageUseCase: GetPublicHostedPageUseCase,
		@inject(GetHostedFileUseCase) private readonly getHostedFileUseCase: GetHostedFileUseCase,
		@inject(DownloadService) private readonly downloadService: DownloadService,
		@inject(GetHostedAssetUrlsUseCase)
		private readonly getAssetUrlsUseCase: GetHostedAssetUrlsUseCase,
	) {
		super();
	}

	@Post('/upload', {
		bodySchema: HostedUploadDto,
		responseSchema: {
			201: HostedUploadResponseDto,
			400: DEFAULT_ERROR_RESPONSES[400],
			401: DEFAULT_ERROR_RESPONSES[401],
			403: DEFAULT_ERROR_RESPONSES[403],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.HOSTED_UPLOAD,
			multipartOptions: { limits: { fileSize: HOSTED_UPLOAD_HARD_LIMIT_BYTES, files: 1 } },
			allowedTokenTypes: ANY_TOKEN_TYPE,
		},
		// before the multipart body is read: it is buffered ahead of every preHandler
		onRequest: hostedUploadGuard,
		schema: UNDOCUMENTED,
	})
	async upload(
		request: IHttpRequest<THostedUploadDto>,
	): Promise<IHttpResponse<THostedUploadResponseDto>> {
		const upload = await holdingUploadSlot(request, () =>
			this.uploadUseCase.execute(request.body, request.user),
		);
		return this.makeApiHttpResponse(201, HostedUploadResponseDto.parse(upload));
	}

	@Get('/assets', {
		querySchema: HostedAssetUrlsRequestQueryDto,
		responseSchema: {
			200: HostedAssetUrlsResponseDto,
			401: DEFAULT_ERROR_RESPONSES[401],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: { allowedTokenTypes: ANY_TOKEN_TYPE },
		schema: UNDOCUMENTED,
	})
	async assets(
		request: IHttpRequest<unknown, unknown, THostedAssetUrlsRequestQueryDto>,
	): Promise<IHttpResponse<THostedAssetUrlsResponseDto>> {
		const keys = request.query.keys.split(',').map((key) => key.trim());
		const urls = await this.getAssetUrlsUseCase.execute(keys, request.user.id);
		return this.makeApiHttpResponse(200, HostedAssetUrlsResponseDto.parse(urls));
	}

	@Get('/by-code/:shortCode', {
		authHandler: false,
		responseSchema: {
			200: PublicHostedPageResponseDto,
			404: DEFAULT_ERROR_RESPONSES[404],
			429: DEFAULT_ERROR_RESPONSES[429],
		},
		config: {
			rateLimitPolicy: RateLimitPolicy.HOSTED_PAGE,
		},
		schema: UNDOCUMENTED,
	})
	async getPage(
		request: IHttpRequest<unknown, TShortCodeParams, unknown, false>,
	): Promise<IHttpResponse<TPublicHostedPageResponseDto>> {
		const page = await this.getPublicHostedPageUseCase.execute(request.params.shortCode);
		return this.makeApiHttpResponse(200, PublicHostedPageResponseDto.parse(page), {
			'Cache-Control': 'public, max-age=60',
		});
	}

	@Get('/by-code/:shortCode/files/:documentId', {
		authHandler: internalApiAuthHandler,
		querySchema: HostedFileQuerySchema,
		config: {
			rateLimitPolicy: RateLimitPolicy.HOSTED_FILE,
		},
		schema: UNDOCUMENTED,
	})
	async getFile(
		request: IHttpRequest<unknown, TFileParams, THostedFileQuery, false>,
	): Promise<IHttpResponse<Readable | undefined>> {
		const { shortCode, documentId } = request.params;
		const host = request.headers['x-hosted-host'] as string | undefined;
		const file = await this.getHostedFileUseCase.execute(shortCode, documentId, host);

		if (request.headers['if-none-match'] === file.etag) {
			// a 304 must repeat the policy headers: browsers merge them into the cached entry
			// no body at all: an empty buffer would make Fastify add `Content-Length: 0`
			return {
				statusCode: 304,
				data: undefined,
				headers: { ...FILE_POLICY_HEADERS, ETag: file.etag },
			};
		}

		// HEAD (answered by this route too) needs the headers only, not a storage read
		// `method` is a prototype getter and not copied onto the parsed request; `raw` is
		if (request.raw.method === 'HEAD') {
			// an empty stream: Fastify's HEAD route keeps the length set here for streams only
			return {
				statusCode: 200,
				data: Readable.from([]),
				headers: {
					...FILE_POLICY_HEADERS,
					'Content-Type': file.contentType,
					'Content-Length': String(file.fileSize),
					'Accept-Ranges': 'bytes',
					ETag: file.etag,
				},
			};
		}

		const range = parseByteRange(
			request.headers.range,
			file.fileSize,
			request.headers['if-range'] as string | undefined,
			file.etag,
		);
		if (range === 'unsatisfiable') {
			return {
				statusCode: 416,
				data: undefined,
				headers: { ...FILE_POLICY_HEADERS, 'Content-Range': `bytes */${file.fileSize}` },
			};
		}

		const stored = await this.getHostedFileUseCase.open(file, range ?? undefined);
		const disposition = request.query.download === '1' ? 'attachment' : 'inline';
		const asciiFilename = this.downloadService.sanitizeAsciiFilename(file.fileName);
		const encodedFilename = this.downloadService.encodeRFC5987ValueChars(file.fileName);

		return {
			statusCode: range ? 206 : 200,
			data: stored.body,
			headers: {
				'Content-Type': file.contentType,
				...(stored.contentLength !== undefined && {
					'Content-Length': String(stored.contentLength),
				}),
				'Accept-Ranges': 'bytes',
				...(range && { 'Content-Range': `bytes ${range.start}-${range.end}/${file.fileSize}` }),
				'Content-Disposition': `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
				...FILE_POLICY_HEADERS,
				ETag: file.etag,
			},
		};
	}
}
