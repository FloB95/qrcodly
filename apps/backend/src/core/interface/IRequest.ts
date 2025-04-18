import { FastifyRequest } from 'fastify';
import { IncomingHttpHeaders } from 'http';

export interface IHttpRequest<B = unknown, P = unknown, Q = unknown> extends FastifyRequest {
	body: B;
	params: P;
	query: Q;
	headers: IncomingHttpHeaders;
	cookies: { [cookieName: string]: string | undefined };
}

export interface IHttpRequestWithAuth<B = unknown, P = unknown, Q = unknown>
	extends IHttpRequest<B, P, Q> {
	user: {
		id: string;
	};
}
