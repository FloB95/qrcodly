import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import { test, expect } from '@playwright/test';
import { resolve } from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
	electronApp = await electron.launch({
		args: [resolve(__dirname, '../../out/main/index.js')],
		env: {
			...process.env,
			NODE_ENV: 'production',
		},
	});

	page = await electronApp.firstWindow();
	await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
	await electronApp?.close();
});

test('app window is visible', async () => {
	const isVisible = await page.isVisible('body');
	expect(isVisible).toBe(true);
});

test('app has correct title', async () => {
	const title = await page.title();
	expect(title).toBeTruthy();
});

test('app loads the dashboard URL', async () => {
	const url = page.url();
	expect(url).toContain('/dashboard');
});

test('electronAPI is exposed to renderer', async () => {
	const hasAPI = await page.evaluate(() => {
		return typeof (globalThis as Record<string, unknown>).electronAPI !== 'undefined';
	});
	expect(hasAPI).toBe(true);
});
