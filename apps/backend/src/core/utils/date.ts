const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const hoursFromNow = (hours: number, from: Date = new Date()): Date =>
	new Date(from.getTime() + hours * MS_PER_HOUR);

export const daysFromNow = (days: number, from: Date = new Date()): Date =>
	new Date(from.getTime() + days * MS_PER_DAY);

export const daysAgo = (days: number, from: Date = new Date()): Date =>
	new Date(from.getTime() - days * MS_PER_DAY);
