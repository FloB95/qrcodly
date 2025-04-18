/**
 * Helper function to extract a specific cookie value from the header.
 */
export const extractCookieValue = (
	cookies: string[] | string | undefined,
	cookieName: string,
): string | undefined => {
	const cookie = Array.isArray(cookies)
		? cookies
				.find((cookie) => cookie.startsWith(`${cookieName}=`))
				?.split('=')[1]
				?.split(';')[0]
		: cookies?.split('=')[1]?.split(';')[0];

	return cookie ? decodeURIComponent(cookie) : undefined;
};
