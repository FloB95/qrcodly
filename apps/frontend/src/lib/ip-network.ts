import { z } from 'zod';

/**
 * The /64 network of an IPv6 address, e.g. `2001:db8:1:2::/64` for `2001:db8:1:2:a:b:c:d`.
 * Devices rotate their IPv6 privacy addresses, but the /64 of their network stays the same.
 * Returns null for anything that is not a plain IPv6 address (IPv4, IPv4-mapped, invalid).
 */
export function ipv6Network64(ip: string): string | null {
	if (!z.ipv6().safeParse(ip).success || ip.includes('.')) return null;

	const [head = '', tail] = ip.split('::');
	const headGroups = head ? head.split(':') : [];
	const tailGroups = tail ? tail.split(':') : [];
	const groups =
		tail === undefined
			? headGroups
			: [
					...headGroups,
					...Array<string>(8 - headGroups.length - tailGroups.length).fill('0'),
					...tailGroups,
				];

	const prefix = groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16));
	// The host half is all zeros, so trailing zero groups of the prefix join the `::`
	while (prefix.at(-1) === '0') prefix.pop();
	return `${prefix.join(':')}::/64`;
}
