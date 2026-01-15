import type { ZodIssue } from 'zod/v3';

export class ApiError extends Error {
	code: number;
	fieldErrors?: ZodIssue[];

	constructor(message: string, code: number, fieldErrors?: ZodIssue[]) {
		super(message);

		this.code = code;
		this.fieldErrors = fieldErrors;
	}
}
