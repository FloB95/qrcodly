interface ResponseLike {
	statusCode: number;
	payload: string;
}

export function toHaveStatusCode(received: ResponseLike, expected: number) {
	const pass = received.statusCode === expected;
	if (pass) {
		return {
			message: () => `expected status code not to be ${expected}`,
			pass: true,
		};
	}
	let body: string = received.payload;
	try {
		body = JSON.stringify(JSON.parse(received.payload) as unknown, null, 2);
	} catch {}
	return {
		message: () =>
			`expected status code ${expected}, received ${received.statusCode}\n\nResponse body:\n${body}`,
		pass: false,
	};
}
