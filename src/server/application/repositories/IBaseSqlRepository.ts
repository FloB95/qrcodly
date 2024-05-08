// Define the types for the `where` object
export type WhereField = {
  eq?: string | Date; // Field is equal to the provided value
  neq?: string | Date; // Field is not equal to the provided value
  like?: string; // Field is similar to the provided value
  gt?: Date; // Field is greater than the provided value
  gte?: Date; // Field is greater than or equal to the provided value
  lt?: Date; // Field is less than the provided value
  lte?: Date; // Field is less than or equal to the provided value
};

// Define the conditions for the `where` object
export type WhereConditions<T> = {
  [K in keyof T]: WhereField; // For each key in T, there is a WhereField
};

// Define the interface for a SQL query to find by certain conditions
export interface ISqlQueryFindBy<T> {
  limit: number; // Maximum number of results to return
  offset: number; // Number of results to skip
  select?: Partial<{ [K in keyof T]: boolean }>; // Fields to include in the result
  where?: WhereConditions<T>; // Conditions to filter the results
}

// Define the base repository interface
export interface IBaseSqlRepository<T> {
  table: any; // Table or collection name
  findAll({ limit, offset, select, where }: ISqlQueryFindBy<T>): Promise<T[]>; // Find all items matching the conditions
  countTotal(): Promise<number>; // Count the total number of items
  findOneById(id: string): Promise<T | undefined>; // Find an item by its ID
  create(item: T): Promise<void>; // Create a new item
  update(item: T, updates: Partial<T>): Promise<void>; // Update an item
  delete(item: T): Promise<boolean>; // Delete an item
  generateId(): Promise<string>; // Generate a new ID
  getTotalCacheKey(): string; // Get the key for the total count cache
}