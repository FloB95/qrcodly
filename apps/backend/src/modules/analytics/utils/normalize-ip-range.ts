import ipaddr from 'ipaddr.js';

/**
 * The one spelling stored for an IP address or CIDR range, so equal ranges written differently are
 * one entry: IPv4-mapped IPv6 becomes plain IPv4, IPv6 is compressed lower case, a range starts at
 * its network address (198.51.100.77/24 -> 198.51.100.0/24) and a full-length prefix is the address
 * itself. Expects a value ScanIpRangeSchema accepted.
 */
export function normalizeIpRange(value: string): string {
	if (!value.includes('/')) return ipaddr.process(value).toString();

	const [address, prefix] = ipaddr.parseCIDR(value);
	if (address instanceof ipaddr.IPv6 && address.isIPv4MappedAddress() && prefix >= 96) {
		return toNetwork(address.toIPv4Address(), prefix - 96);
	}
	return toNetwork(address, prefix);
}

function toNetwork(address: ipaddr.IPv4 | ipaddr.IPv6, prefix: number): string {
	const cidr = `${address.toString()}/${prefix}`;
	const isIPv4 = address instanceof ipaddr.IPv4;
	const network = isIPv4
		? ipaddr.IPv4.networkAddressFromCIDR(cidr)
		: ipaddr.IPv6.networkAddressFromCIDR(cidr);
	return prefix === (isIPv4 ? 32 : 128) ? network.toString() : `${network.toString()}/${prefix}`;
}
