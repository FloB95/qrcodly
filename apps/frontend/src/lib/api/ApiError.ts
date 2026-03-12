import type { z } from 'zod';

export class ApiError extends Error {
	code: number;
	fieldErrors?: z.core.$ZodIssue[];

	constructor(message: string, code: number, fieldErrors?: z.core.$ZodIssue[]) {
		super(message);

		this.code = code;
		this.fieldErrors = fieldErrors;
	}
}
