import { z } from 'zod';

export const MAX_SCAN_IP_EXCLUSIONS = 10;
export const SCAN_IP_EXCLUSION_LABEL_MAX_LENGTH = 100;

// Anything wider is almost always a typo and would stop counting scans from whole providers
const MIN_PREFIX_LENGTH = { ipv4: 16, ipv6: 32 } as const;

const IpOrCidr = z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()]);

/** A single IPv4/IPv6 address or a CIDR range, e.g. `203.0.113.7` or `2001:db8:1200::/48`. */
export const ScanIpRangeSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(64)
	.refine((value) => IpOrCidr.safeParse(value).success, {
		message: 'Must be an IP address or a CIDR range',
	})
	.refine(
		(value) => {
			const [address = '', prefix] = value.split('/');
			if (!prefix) return true;
			const min = address.includes(':') ? MIN_PREFIX_LENGTH.ipv6 : MIN_PREFIX_LENGTH.ipv4;
			return Number(prefix) >= min;
		},
		{ message: 'Range is too wide: use at least /16 for IPv4 and /32 for IPv6' },
	);

export const CreateScanIpExclusionDto = z.object({
	ipRange: ScanIpRangeSchema,
	label: z.string().trim().max(SCAN_IP_EXCLUSION_LABEL_MAX_LENGTH).optional(),
});

export type TCreateScanIpExclusionDto = z.infer<typeof CreateScanIpExclusionDto>;
