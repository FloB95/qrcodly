import { ForbiddenError } from '@/core/error/http';
import { type IHttpResponse } from '@/core/interface/response.interface';

export default abstract class AbstractController {
	protected makeApiHttpResponse<T>(
		statusCode: number,
		data: T,
		additionalHeaders: Record<string, string> = {},
	): IHttpResponse<T> {
		return {
			statusCode,
			data,
			headers: {
				'Content-Type': 'application/json',
				...additionalHeaders,
			},
		};
	}

	protected ensureOwnership(entity: { createdBy: string | null }, userId: string): void {
		if (entity.createdBy !== userId) {
			throw new ForbiddenError();
		}
	}
}
