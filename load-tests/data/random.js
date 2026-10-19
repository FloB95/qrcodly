// Plain-JS random helpers (no k6 imports, so Node can load the payload generators too).

export function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(items) {
	return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

export function sample(items, count) {
	const copy = items.slice();
	const out = [];
	while (copy.length && out.length < count) {
		out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
	}
	return out;
}

export function chance(probability) {
	return Math.random() < probability;
}

/** Picks from `[[value, weight], ...]`. */
export function weighted(entries) {
	const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
	let roll = Math.random() * total;
	for (const [value, weight] of entries) {
		roll -= weight;
		if (roll < 0) return value;
	}
	return entries[entries.length - 1][0];
}

export function randomId(length = 6) {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let out = '';
	for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
}
