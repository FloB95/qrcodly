/* eslint-disable @typescript-eslint/unbound-method */
import { ShutdownService } from '@/core/shutdown/ShutdownService';
import { OnShutdown } from '../OnShutdown';
import { container } from 'tsyringe';
import { mock } from 'jest-mock-extended';

describe('OnShutdown', () => {
	let shutdownService: ShutdownService;

	beforeEach(() => {
		shutdownService = new ShutdownService(mock());
		jest.spyOn(shutdownService, 'register');
		container.registerInstance(ShutdownService, shutdownService);
	});

	it('should register a methods that is decorated with OnShutdown', () => {
		class TestClass {
			@OnShutdown()
			async onShutdown() {}
		}

		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
			methodName: 'onShutdown',
			serviceClass: TestClass,
		});
	});

	it('should register multiple methods in the same class', () => {
		class TestClass {
			@OnShutdown()
			async one() {}

			@OnShutdown()
			async two() {}
		}

		expect(shutdownService.register).toHaveBeenCalledTimes(2);
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
			methodName: 'one',
			serviceClass: TestClass,
		});
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
			methodName: 'two',
			serviceClass: TestClass,
		});
	});

	it('should throw an error if the decorated member is not a function', () => {
		expect(() => {
			class TestClass {
				// @ts-expect-error Testing invalid code
				@OnShutdown()
				onShutdown = 'not a function';
			}

			new TestClass();
		}).toThrow('TestClass.onShutdown() must be a method on TestClass to use "OnShutdown"');
	});

	it('should throw if the priority is invalid', () => {
		expect(() => {
			class TestClass {
				@OnShutdown(201)
				async onShutdown() {}
			}

			new TestClass();
		}).toThrow('Invalid shutdown priority. Please set it between 0 and 200.');

		expect(() => {
			class TestClass {
				@OnShutdown(-1)
				async onShutdown() {}
			}

			new TestClass();
		}).toThrow('Invalid shutdown priority. Please set it between 0 and 200.');
	});
});
