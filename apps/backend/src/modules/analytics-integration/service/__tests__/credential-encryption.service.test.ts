import 'reflect-metadata';
import { CredentialEncryptionService } from '../credential-encryption.service';

jest.mock('@/core/config/env', () => ({
	env: {
		// 64-char hex = 32 bytes for AES-256
		ANALYTICS_ENCRYPTION_KEY: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
	},
}));

describe('CredentialEncryptionService', () => {
	let service: CredentialEncryptionService;

	beforeEach(() => {
		service = new CredentialEncryptionService();
	});

	it('should encrypt and decrypt credentials round-trip', () => {
		const credentials = {
			measurementId: 'G-ABCDEF1234',
			apiSecret: 'my_super_secret',
		};

		const { encrypted, iv, tag } = service.encrypt(credentials);

		expect(encrypted).toBeDefined();
		expect(encrypted.length).toBeGreaterThan(0);
		expect(iv).toBeDefined();
		expect(tag).toBeDefined();

		const decrypted = service.decrypt(encrypted, iv, tag);

		expect(decrypted).toEqual(credentials);
	});

	it('should produce different ciphertexts for the same plaintext (random IV)', () => {
		const credentials = { measurementId: 'G-TEST123456', apiSecret: 'secret' };

		const result1 = service.encrypt(credentials);
		const result2 = service.encrypt(credentials);

		// IVs should be different (random)
		expect(result1.iv).not.toBe(result2.iv);
		// Encrypted data should be different due to different IV
		expect(result1.encrypted).not.toBe(result2.encrypted);

		// But both should decrypt to the same value
		const decrypted1 = service.decrypt(result1.encrypted, result1.iv, result1.tag);
		const decrypted2 = service.decrypt(result2.encrypted, result2.iv, result2.tag);
		expect(decrypted1).toEqual(decrypted2);
	});

	it('should handle complex credential objects', () => {
		const credentials = {
			matomoUrl: 'https://matomo.example.com',
			siteId: '42',
			authToken: 'abc123def456',
		};

		const { encrypted, iv, tag } = service.encrypt(credentials);
		const decrypted = service.decrypt(encrypted, iv, tag);

		expect(decrypted).toEqual(credentials);
	});

	it('should throw on decryption with wrong IV', () => {
		const credentials = { measurementId: 'G-TEST123456', apiSecret: 'secret' };
		const { encrypted, tag } = service.encrypt(credentials);
		const wrongIv = 'aabbccddeeff112233445566'; // 24 hex chars = 12 bytes

		expect(() => service.decrypt(encrypted, wrongIv, tag)).toThrow();
	});

	it('should throw on decryption with wrong tag', () => {
		const credentials = { measurementId: 'G-TEST123456', apiSecret: 'secret' };
		const { encrypted, iv } = service.encrypt(credentials);
		const wrongTag = 'aabbccddeeff00112233445566778899'; // 32 hex chars = 16 bytes

		expect(() => service.decrypt(encrypted, iv, wrongTag)).toThrow();
	});

	it('should throw on decryption with tampered ciphertext', () => {
		const credentials = { measurementId: 'G-TEST123456', apiSecret: 'secret' };
		const { encrypted, iv, tag } = service.encrypt(credentials);

		// Tamper with the encrypted data
		const tampered = 'ff' + encrypted.slice(2);

		expect(() => service.decrypt(tampered, iv, tag)).toThrow();
	});
});

describe('CredentialEncryptionService (missing key)', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('should throw when ANALYTICS_ENCRYPTION_KEY is not set', () => {
		jest.mock('@/core/config/env', () => ({
			env: {
				ANALYTICS_ENCRYPTION_KEY: undefined,
			},
		}));

		// Re-require to get fresh module with new mock
		const { CredentialEncryptionService: FreshService } = jest.requireActual(
			'../credential-encryption.service',
		) as { CredentialEncryptionService: typeof CredentialEncryptionService };

		const service = new FreshService();

		expect(() => service.encrypt({ foo: 'bar' })).toThrow('ANALYTICS_ENCRYPTION_KEY');
	});
});
