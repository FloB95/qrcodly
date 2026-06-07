import type { z } from 'zod';

export class ApiError extends Error {
	code: number;
	fieldErrors?: z.core.$ZodIssue[];
	errorCode?: string;

	constructor(message: string, code: number, fieldErrors?: z.core.$ZodIssue[], errorCode?: string) {
		super(message);

		this.code = code;
		this.fieldErrors = fieldErrors;
		this.errorCode = errorCode;
	}
}
