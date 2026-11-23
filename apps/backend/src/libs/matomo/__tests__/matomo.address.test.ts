import http from 'node:http';
import { type LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { type AddressInfo } from 'node:net';
import { Agent } from 'undici';
import { isPublicAddress, lookupPublicAddress, validateMatomoUrl } from '../matomo.address';

jest.mock('node:dns/promises', () => ({
	...jest.requireActual('node:dns/promises'),
	lookup: jest.fn(),
}));

const mockLookup = lookup as unknown as jest.Mock<Promise<LookupAddress[]>>;

const PRIVATE_ADDRESS_MESSAGE = 'Matomo URL must not point to a private or internal address';
const PUBLIC_V4 = '93.184.215.14';
const PUBLIC_V6 = '2606:2800:21f:cb07:6820:80da:af6b:8b2c';
const NON_PUBLIC_ANSWERS = [
	'10.0.0.5',
	'127.0.0.1',
	'169.254.169.254',
	'::1',
	'fc00::1',
	'::ffff:127.0.0.1',
];

function answer(...addresses: string[]): LookupAddress[] {
	return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
}

function lookupVia(hostname: string, options: { all?: boolean; family?: number }) {
	return new Promise<{ error: Error | null; address: unknown; family?: number }>((resolve) =>
		lookupPublicAddress(hostname, options, (error, address, family) =>
			resolve({ error, address, family }),
		),
	);
}

beforeEach(() => {
	mockLookup.mockReset();
	mockLookup.mockResolvedValue(answer(PUBLIC_V4));
});

describe('isPublicAddress', () => {
	it.each([PUBLIC_V4, PUBLIC_V6, `::ffff:${PUBLIC_V4}`])('should accept %s', (address) => {
		expect(isPublicAddress(address)).toBe(true);
	});

	it.each([
		'10.0.0.1',
		'172.16.0.1',
		'192.168.1.1',
		'127.0.0.1',
		'169.254.169.254',
		'100.64.0.1',
		'0.0.0.0',
		'255.255.255.255',
		'224.0.0.1',
		'240.0.0.1',
		'::1',
		'::',
		'fc00::1',
		'fd12:3456::1',
		'fe80::1',
		'fe80::1%eth0',
		'ff02::1',
		'::ffff:127.0.0.1',
		'::ffff:10.0.0.1',
		'::7f00:1',
		'64:ff9b::a00:1',
		'2002:a00:1::1',
		'2001::1',
		'not-an-ip',
	])('should reject %s', (address) => {
		expect(isPublicAddress(address)).toBe(false);
	});
});

describe('validateMatomoUrl', () => {
	it('should accept a host that resolves to public addresses', async () => {
		mockLookup.mockResolvedValue(answer(PUBLIC_V4, PUBLIC_V6));

		const url = await validateMatomoUrl('https://matomo.example.com/analytics');

		expect(url.toString()).toBe('https://matomo.example.com/analytics');
		expect(mockLookup).toHaveBeenCalledWith('matomo.example.com', { all: true });
	});

	it.each(NON_PUBLIC_ANSWERS)('should reject a host that resolves to %s', async (address) => {
		mockLookup.mockResolvedValue(answer(address));

		await expect(validateMatomoUrl('https://matomo.example.com')).rejects.toThrow(
			PRIVATE_ADDRESS_MESSAGE,
		);
	});

	it('should reject a host when one of its addresses is private', async () => {
		mockLookup.mockResolvedValue(answer(PUBLIC_V4, '10.0.0.5'));

		await expect(validateMatomoUrl('https://matomo.example.com')).rejects.toThrow(
			PRIVATE_ADDRESS_MESSAGE,
		);
	});

	it.each([
		'https://[::1]',
		'https://[::ffff:127.0.0.1]',
		'https://[fc00::1]',
		'https://127.0.0.1.',
		'https://0x7f000001',
		'https://169.254.169.254',
	])('should reject the IP literal %s without DNS', async (url) => {
		await expect(validateMatomoUrl(url)).rejects.toThrow(PRIVATE_ADDRESS_MESSAGE);
		expect(mockLookup).not.toHaveBeenCalled();
	});

	it.each([`https://${PUBLIC_V4}`, `https://[${PUBLIC_V6}]`])(
		'should accept the public IP literal %s without DNS',
		async (url) => {
			await expect(validateMatomoUrl(url)).resolves.toBeInstanceOf(URL);
			expect(mockLookup).not.toHaveBeenCalled();
		},
	);

	it('should resolve a fully qualified host without its trailing dot', async () => {
		await validateMatomoUrl('https://matomo.example.com.');

		expect(mockLookup).toHaveBeenCalledWith('matomo.example.com', { all: true });
	});

	it('should reject a fully qualified host that resolves to a private address', async () => {
		mockLookup.mockResolvedValue(answer('127.0.0.1'));

		await expect(validateMatomoUrl('https://matomo.example.com.')).rejects.toThrow(
			PRIVATE_ADDRESS_MESSAGE,
		);
	});

	it.each(['https://localhost', 'https://localhost.', 'https://printer.local'])(
		'should reject %s by name',
		async (url) => {
			await expect(validateMatomoUrl(url)).rejects.toThrow(PRIVATE_ADDRESS_MESSAGE);
			expect(mockLookup).not.toHaveBeenCalled();
		},
	);

	it('should leave a host that does not resolve to the request', async () => {
		mockLookup.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));

		await expect(validateMatomoUrl('https://matomo.example.com')).resolves.toBeInstanceOf(URL);
	});

	it('should keep the errors for an invalid format and a non-HTTPS URL', async () => {
		await expect(validateMatomoUrl('not a url')).rejects.toThrow('Invalid Matomo URL format');
		await expect(validateMatomoUrl('http://matomo.example.com')).rejects.toThrow(
			'Matomo URL must use HTTPS',
		);
	});
});

describe('lookupPublicAddress', () => {
	it('should answer with every address when asked for all', async () => {
		mockLookup.mockResolvedValue(answer(PUBLIC_V4, PUBLIC_V6));

		const result = await lookupVia('matomo.example.com', { all: true });

		expect(result.error).toBeNull();
		expect(result.address).toEqual(answer(PUBLIC_V4, PUBLIC_V6));
		expect(mockLookup).toHaveBeenCalledWith('matomo.example.com', { all: true });
	});

	it('should resolve all addresses but answer with the first when asked for one', async () => {
		mockLookup.mockResolvedValue(answer(PUBLIC_V4, PUBLIC_V6));

		const result = await lookupVia('matomo.example.com', { family: 0 });

		expect(result).toEqual({ error: null, address: PUBLIC_V4, family: 4 });
		expect(mockLookup).toHaveBeenCalledWith('matomo.example.com', { family: 0, all: true });
	});

	it.each(NON_PUBLIC_ANSWERS)('should fail when the host resolves to %s', async (address) => {
		mockLookup.mockResolvedValue(answer(address));

		const result = await lookupVia('matomo.example.com', { all: true });

		expect(result.error?.message).toBe(PRIVATE_ADDRESS_MESSAGE);
	});

	it('should fail when one of the addresses is private', async () => {
		mockLookup.mockResolvedValue(answer(PUBLIC_V4, '10.0.0.5'));

		const result = await lookupVia('matomo.example.com', { family: 0 });

		expect(result.error?.message).toBe(PRIVATE_ADDRESS_MESSAGE);
	});

	it('should pass a DNS error through', async () => {
		const dnsError = Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
		mockLookup.mockRejectedValue(dnsError);

		const result = await lookupVia('matomo.example.com', { all: true });

		expect(result.error).toBe(dnsError);
	});

	it('should keep an Agent from connecting when the host resolves to a private address', async () => {
		let requests = 0;
		const server = http.createServer((_req, res) => {
			requests++;
			res.end();
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;
		const agent = new Agent({ connect: { lookup: lookupPublicAddress } });
		mockLookup.mockResolvedValue(answer('127.0.0.1'));

		try {
			await expect(
				agent.request({ origin: `http://matomo.example.com:${port}`, path: '/', method: 'GET' }),
			).rejects.toThrow(PRIVATE_ADDRESS_MESSAGE);
			expect(requests).toBe(0);
		} finally {
			await agent.close();
			await new Promise((resolve) => server.close(resolve));
		}
	});
});
