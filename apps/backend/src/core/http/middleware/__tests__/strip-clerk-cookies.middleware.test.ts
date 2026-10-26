import { type FastifyReply, type FastifyRequest } from 'fastify';
import { stripClerkCookiesMiddleware } from '../strip-clerk-cookies.middleware';

describe('stripClerkCookiesMiddleware', () => {
	const strip = (cookie?: string) => {
		const request = { headers: cookie === undefined ? {} : { cookie } } as FastifyRequest;
		const done = jest.fn();
		stripClerkCookiesMiddleware(request, {} as FastifyReply, done);
		expect(done).toHaveBeenCalledTimes(1);
		return request.headers.cookie;
	};

	it('removes every cookie Clerk authenticates from, suffixed variants included', () => {
		expect(
			strip(
				'__session=jwt; __session_Ab12Cd34=jwt; __client_uat=1; __client_uat_Ab12Cd34=1; ' +
					'__refresh_Ab12Cd34=r; __clerk_db_jwt=dvb; __clerk_handshake=h; __clerk_handshake_nonce=n',
			),
		).toBeUndefined();
	});

	it('keeps unrelated cookies', () => {
		expect(strip('theme=dark; __session=jwt; NEXT_LOCALE=de')).toBe('theme=dark; NEXT_LOCALE=de');
	});

	it('leaves requests without cookies untouched', () => {
		expect(strip()).toBeUndefined();
	});
});
