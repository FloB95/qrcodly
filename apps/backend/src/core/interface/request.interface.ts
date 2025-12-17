import { type FastifyRequest } from 'fastify';
import { type IncomingHttpHeaders } from 'http';

export interface IHttpRequest<B = unknown, P = unknown, Q = unknown> extends FastifyRequest {
	body: B;
	params: P;
	query: Q;
	headers: IncomingHttpHeaders;
	cookies: { [cookieName: string]: string | undefined };
}

export interface IHttpRequestWithAuth<B = unknown, P = unknown, Q = unknown> extends IHttpRequest<
	B,
	P,
	Q
> {
	user: {
		id: string;
		tokenType: 'session_token' | 'api_key';
	};
}
