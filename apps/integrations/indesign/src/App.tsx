import { useCallback, useEffect, useState } from 'react';
import { clearApiKey, getStoredApiKey, storeApiKey } from './lib/uxp';
import { SettingsScreen } from './screens/SettingsScreen';
import { ListScreen } from './screens/ListScreen';
import { CreateScreen } from './screens/CreateScreen';

type Screen = 'loading' | 'settings' | 'list' | 'create';

export default function App() {
	const [screen, setScreen] = useState<Screen>('loading');
	const [apiKey, setApiKey] = useState<string | null>(null);

	useEffect(() => {
		getStoredApiKey().then((key) => {
			setApiKey(key);
			setScreen(key ? 'list' : 'settings');
		});
	}, []);

	const onSaveKey = useCallback(async (key: string) => {
		await storeApiKey(key);
		setApiKey(key);
		setScreen('list');
	}, []);

	const onSignOut = useCallback(async () => {
		await clearApiKey();
		setApiKey(null);
		setScreen('settings');
	}, []);

	if (screen === 'loading') return <div className="app muted">Loading…</div>;

	if (screen === 'settings') return <SettingsScreen onSave={onSaveKey} initialKey={apiKey} />;

	if (!apiKey) return null;

	if (screen === 'create') {
		return (
			<CreateScreen
				apiKey={apiKey}
				onDone={() => setScreen('list')}
				onCancel={() => setScreen('list')}
			/>
		);
	}

	return <ListScreen apiKey={apiKey} onSignOut={onSignOut} onCreate={() => setScreen('create')} />;
}
