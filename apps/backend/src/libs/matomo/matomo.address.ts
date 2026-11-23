import { lookup } from 'node:dns/promises';
import { isIP, type LookupFunction } from 'node:net';
import ipaddr from 'ipaddr.js';

const PRIVATE_ADDRESS_MESSAGE = 'Matomo URL must not point to a private or internal address';

const GLOBAL_UNICAST_V6 = ipaddr.parseCIDR('2000::/3');

/** Public unicast only; an IPv4-mapped IPv6 address counts as the IPv4 address it carries */
export function isPublicAddress(address: string): boolean {
	if (!ipaddr.isValid(address)) return false;
	const ip = ipaddr.process(address);
	// ipaddr calls IPv4-compatible IPv6 (::a.b.c.d) unicast; public IPv6 lies in 2000::/3
	return ip.range() === 'unicast' && (ip.kind() === 'ipv4' || ip.match(GLOBAL_UNICAST_V6));
}

/**
 * `lookup` for the connections of Matomo requests: fails when the host resolves to any address
 * that is not public, so a DNS answer that changed after validateMatomoUrl cannot reach an
 * internal host
 */
export const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
	lookup(hostname, { ...options, all: true }).then(
		(addresses) => {
			if (addresses.some(({ address }) => !isPublicAddress(address))) {
				callback(new Error(PRIVATE_ADDRESS_MESSAGE), '');
			} else if (options.all) {
				callback(null, addresses);
			} else {
				callback(null, addresses[0].address, addresses[0].family);
			}
		},
		(error: NodeJS.ErrnoException) => callback(error, ''),
	);
};

async function hasOnlyPublicAddresses(host: string): Promise<boolean> {
	if (isIP(host)) return isPublicAddress(host);
	try {
		const addresses = await lookup(host, { all: true });
		return addresses.every(({ address }) => isPublicAddress(address));
	} catch {
		// A host that does not resolve fails at connect, where lookupPublicAddress checks it again
		return true;
	}
}

/** Throws for a malformed or non-HTTPS URL and for a host with any address that is not public */
export async function validateMatomoUrl(raw: string): Promise<URL> {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error('Invalid Matomo URL format');
	}
	if (url.protocol !== 'https:') {
		throw new Error('Matomo URL must use HTTPS');
	}
	// URL keeps the brackets of an IPv6 literal and the trailing dot of a fully qualified name
	const host = url.hostname
		.toLowerCase()
		.replace(/^\[(.*)\]$/, '$1')
		.replace(/\.$/, '');
	if (host === 'localhost' || host.endsWith('.local') || !(await hasOnlyPublicAddresses(host))) {
		throw new Error(PRIVATE_ADDRESS_MESSAGE);
	}
	return url;
}
