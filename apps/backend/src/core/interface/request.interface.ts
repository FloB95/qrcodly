import { type FastifyRequest } from 'fastify';
import { type IncomingHttpHeaders } from 'http';
import { type TUser } from '../domain/schema/UserSchema';

export interface IHttpRequest<
	Body = unknown,
	Params = unknown,
	Query = unknown,
	AuthRequired extends boolean = true,
	WithEvent extends boolean = false,
> extends FastifyRequest {
	body: Body;
	params: Params;
	query: Query;
	headers: IncomingHttpHeaders;
	cookies: { [cookieName: string]: string | undefined };
	user: AuthRequired extends true ? TUser : TUser | undefined;
	event: WithEvent extends true ? any : undefined;
}
