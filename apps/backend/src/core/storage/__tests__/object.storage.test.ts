/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { container } from 'tsyringe';
import { ObjectStorage } from '..';

describe('S3StorageService', () => {
	const fileStorage = container.resolve(ObjectStorage);

	const testKey = 'test-file-key';
	const testData = Buffer.from('file data');
	const mimeType = 'text/plain';

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('upload', () => {
		it('uploads a file successfully', async () => {
			const uploadSpy = jest.spyOn(fileStorage, 'upload').mockResolvedValue(undefined);

			await expect(fileStorage.upload(testKey, testData, mimeType)).resolves.toBeUndefined();
			expect(uploadSpy).toHaveBeenCalledWith(testKey, testData, mimeType);
		});

		it('throws an error if upload fails', async () => {
			jest.spyOn(fileStorage, 'upload').mockRejectedValue(new Error('Upload failed'));

			await expect(fileStorage.upload(testKey, testData, mimeType)).rejects.toThrow(
				'Upload failed',
			);
		});
	});

	describe('get', () => {
		it('retrieves a file successfully', async () => {
			jest.spyOn(fileStorage, 'get').mockResolvedValue(testData);

			const result = await fileStorage.get(testKey);
			expect(result).toEqual(testData);
			expect(fileStorage.get).toHaveBeenCalledWith(testKey);
		});

		it('returns null when file is not found', async () => {
			jest.spyOn(fileStorage, 'get').mockResolvedValue(null);

			const result = await fileStorage.get(testKey);
			expect(result).toBeNull();
		});

		it('throws an error if fetch fails', async () => {
			jest.spyOn(fileStorage, 'get').mockRejectedValue(new Error('Fetch failed'));

			await expect(fileStorage.get(testKey)).rejects.toThrow('Fetch failed');
		});
	});

	describe('delete', () => {
		it('deletes a file successfully', async () => {
			const deleteSpy = jest.spyOn(fileStorage, 'delete').mockResolvedValue(undefined);

			await expect(fileStorage.delete(testKey)).resolves.toBeUndefined();
			expect(deleteSpy).toHaveBeenCalledWith(testKey);
		});

		it('throws an error if deletion fails', async () => {
			jest.spyOn(fileStorage, 'delete').mockRejectedValue(new Error('Delete failed'));

			await expect(fileStorage.delete(testKey)).rejects.toThrow('Delete failed');
		});
	});

	describe('getSignedUrl', () => {
		it('returns a signed URL', async () => {
			const mockUrl = 'https://example.com/signed-url';
			jest.spyOn(fileStorage, 'getSignedUrl').mockResolvedValue(mockUrl);

			const url = await fileStorage.getSignedUrl(testKey);
			expect(url).toBe(mockUrl);
		});

		it('throws an error if signed URL generation fails', async () => {
			jest.spyOn(fileStorage, 'getSignedUrl').mockRejectedValue(new Error('Signed URL failed'));

			await expect(fileStorage.getSignedUrl(testKey)).rejects.toThrow('Signed URL failed');
		});
	});
});
