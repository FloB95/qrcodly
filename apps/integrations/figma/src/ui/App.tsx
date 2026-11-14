import { useCallback, useEffect, useState } from 'react';
import type { InsertFormat } from '../shared/messages';
import { QrcodlyApi } from './lib/api-client';
import { plugin } from './lib/bridge';
import { Logo } from './components/Logo';
import { Spinner } from './components/Spinner';
import { SettingsScreen } from './screens/SettingsScreen';
import { ListScreen } from './screens/ListScreen';
import { CreateScreen } from './screens/CreateScreen';

type Screen = 'loading' | 'settings' | 'list' | 'create';

export default function App() {
	const [screen, setScreen] = useState<Screen>('loading');
	const [apiKey, setApiKey] = useState<string | null>(null);
	const [insertFormat, setInsertFormat] = useState<InsertFormat>('svg');
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		plugin
			.getSettings()
			.then((settings) => {
				setApiKey(settings.apiKey);
				setInsertFormat(settings.insertFormat);
				setScreen(settings.apiKey ? 'list' : 'settings');
			})
			.catch((err: unknown) => {
				// Don't trap the panel on the loading screen if clientStorage
				// errors — fall through to settings so the user can re-enter.
				console.error('qrcodly: failed to read settings', err);
				setLoadError(err instanceof Error ? err.message : String(err));
				setScreen('settings');
			});
	}, []);

	const onSaveKey = useCallback(async (key: string) => {
		await new QrcodlyApi(key).verifyKey();
		await plugin.setApiKey(key);
		setApiKey(key);
		setScreen('list');
	}, []);

	const onSignOut = useCallback(async () => {
		await plugin.clearApiKey();
		setApiKey(null);
		setScreen('settings');
	}, []);

	const onInsertFormatChange = useCallback((format: InsertFormat) => {
		setInsertFormat(format);
		plugin.setInsertFormat(format).catch(() => {
			/* preference only — keep the in-memory choice */
		});
	}, []);

	if (screen === 'loading') {
		return (
			<div className="app splash">
				<Logo size={32} />
				<Spinner />
			</div>
		);
	}

	if (screen === 'settings' || !apiKey) {
		return <SettingsScreen onSave={onSaveKey} initialKey={apiKey} loadError={loadError} />;
	}

	if (screen === 'create') {
		return (
			<CreateScreen
				apiKey={apiKey}
				insertFormat={insertFormat}
				onDone={() => setScreen('list')}
				onCancel={() => setScreen('list')}
			/>
		);
	}

	return (
		<ListScreen
			apiKey={apiKey}
			insertFormat={insertFormat}
			onInsertFormatChange={onInsertFormatChange}
			onSignOut={onSignOut}
			onCreate={() => setScreen('create')}
		/>
	);
}
