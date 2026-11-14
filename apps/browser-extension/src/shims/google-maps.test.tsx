import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'use-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { LocationSection } from '@/components/qr-generator/content/LocationSection';
import { loadMessages } from '@ext/lib/i18n';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LocationSection in the extension', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('renders the address input without loading the Google Maps script', async () => {
		const messages = await loadMessages('en');
		const container = document.createElement('div');
		document.body.appendChild(container);

		await act(async () => {
			createRoot(container).render(
				<IntlProvider locale="en" messages={messages}>
					<LocationSection value={{ address: '' }} onChange={() => {}} />
				</IntlProvider>,
			);
		});

		expect(container.querySelector('input[name="address"]')).not.toBeNull();
		expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull();
	});
});
