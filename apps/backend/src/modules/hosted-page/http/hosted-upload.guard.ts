import { finished } from 'node:stream';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { getAuth } from '@clerk/fastify';
import { HOSTED_PAGE_PLAN_LIMITS } from '@/core/config/plan.config';
import { CustomApiError, UnauthorizedError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { TooManyRequestsError } from '@/core/error/http/too-many-requests.error';
import { resolveUserPlan } from '@/core/http/middleware/add-user-to-request.middleware';
import { HOSTED_UPLOAD_HARD_LIMIT_BYTES } from '../config/constants';

/** Multipart boundaries and the other form fields, on top of the file itself. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
/** Uploads one user may run at once; the editor starts up to four (documents, cover, logo). */
export const MAX_UPLOADS_PER_USER = 4;
/**
 * Upload bytes one backend process holds at once, whoever sends them. Each upload sits in memory up
 * to three times while it is parsed (with a 1 GiB pod limit: about 300 MB at most for uploads).
 */
export const MAX_UPLOAD_BYTES_PER_PROCESS = 100 * 1024 * 1024;

type TUploadSlot = { release: () => void; handlerRunning: boolean };

const uploadsByUser = new Map<string, number>();
let uploadsInProcess = 0;
let bytesInProcess = 0;
const slots = new WeakMap<FastifyRequest['raw'], TUploadSlot>();

/** Uploads in flight right now, for tests and diagnostics. */
export const uploadsInFlight = () => ({
	total: uploadsInProcess,
	bytes: bytesInProcess,
	users: uploadsByUser.size,
});

function takeSlot(userId: string, bytes: number): TUploadSlot {
	uploadsByUser.set(userId, (uploadsByUser.get(userId) ?? 0) + 1);
	uploadsInProcess++;
	bytesInProcess += bytes;
	let released = false;
	return {
		handlerRunning: false,
		release: () => {
			if (released) return;
			released = true;
			uploadsInProcess--;
			bytesInProcess -= bytes;
			const remaining = (uploadsByUser.get(userId) ?? 1) - 1;
			if (remaining > 0) uploadsByUser.set(userId, remaining);
			else uploadsByUser.delete(userId);
		},
	};
}

/**
 * Runs before the multipart body is read: the multipart plugin buffers the whole file in a
 * preValidation hook, ahead of authentication, plan check and rate limit. So the request is refused
 * here when it is anonymous, from a plan without uploads, larger than any plan allows, or one too
 * many at once. An accepted upload holds its slot while its bytes are in memory: until the handler
 * is done ({@link holdingUploadSlot}), or until the response ends when it fails before that.
 */
export async function hostedUploadGuard(request: FastifyRequest, reply: FastifyReply) {
	const length = Number(request.headers['content-length']);
	if (!request.headers['content-length'] || !Number.isFinite(length)) {
		throw new CustomApiError('A Content-Length header is required for uploads', 411);
	}
	if (length > HOSTED_UPLOAD_HARD_LIMIT_BYTES + MULTIPART_OVERHEAD_BYTES) {
		throw new CustomApiError('The file is too large', 413);
	}

	// a first check only: the full authentication (bans, foreign sessions) runs as usual later
	const { userId } = getAuth(request, { acceptsToken: ['session_token', 'api_key'] }) as {
		userId: string | null;
	};
	if (!userId) {
		throw new UnauthorizedError('You need to be logged in to upload files for hosted pages');
	}
	if (HOSTED_PAGE_PLAN_LIMITS[await resolveUserPlan(userId)].maxFiles === 0) {
		throw new PlanLimitExceededError('hosted file', 0);
	}

	if (
		(uploadsByUser.get(userId) ?? 0) >= MAX_UPLOADS_PER_USER ||
		bytesInProcess + length > MAX_UPLOAD_BYTES_PER_PROCESS
	) {
		throw new TooManyRequestsError('a few seconds');
	}
	const slot = takeSlot(userId, length);
	slots.set(request.raw, slot);
	// also fires when the connection is already gone; the running handler releases on its own
	finished(reply.raw, () => {
		if (!slot.handlerRunning) slot.release();
	});
}

/** Runs the upload handler while it holds the slot the guard took, even if the client went away. */
export async function holdingUploadSlot<T>(request: FastifyRequest, work: () => Promise<T>) {
	const slot = slots.get(request.raw);
	if (slot) slot.handlerRunning = true;
	try {
		return await work();
	} finally {
		slot?.release();
	}
}
