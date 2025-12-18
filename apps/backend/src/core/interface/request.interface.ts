import { type FastifyRequest } from 'fastify';
import { type IncomingHttpHeaders } from 'http';
import { type IUser } from './user.interface';

export interface IHttpRequest<B = unknown, P = unknown, Q = unknown> extends FastifyRequest {
	user: null | IUser;
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
	user: IUser;
}
export interface IHttpRequestWithEvent<B = unknown, P = unknown, Q = unknown> extends IHttpRequest<
	B,
	P,
	Q
> {
	event: any;
}
