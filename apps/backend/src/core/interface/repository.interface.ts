import { type SQL } from 'drizzle-orm';

// Define the types for the `where` object
export type WhereField = {
	eq?: string | Date | boolean | null; // Field is equal to the provided value
	neq?: string | Date | boolean | null; // Field is not equal to the provided value
	like?: string; // Field is similar to the provided value
	gt?: Date; // Field is greater than the provided value
	gte?: Date; // Field is greater than or equal to the provided value
	lt?: Date; // Field is less than the provided value
	lte?: Date; // Field is less than or equal to the provided value
};

// Define the conditions for the `where` object
export type WhereConditions<T> = Partial<{
	[K in keyof T]: WhereField; // For each key in T, there is a WhereField
}>;

// Define the interface for a SQL query to find by certain conditions
export interface ISqlQueryFindBy<T> {
	limit: number; // Maximum number of results to return
	page: number; // Number of results to skip
	where?: WhereConditions<T> | SQL<T>; // Conditions to filter the results
}
