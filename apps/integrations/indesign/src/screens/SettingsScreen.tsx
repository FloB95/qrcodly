import { useState } from 'react';
import { BrandHeader } from '../components/Logo';
import { Button } from '../components/Button';

type Props = {
	initialKey: string | null;
	onSave: (key: string) => Promise<void>;
};

export function SettingsScreen({ initialKey, onSave }: Props) {
	const [input, setInput] = useState(initialKey ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const save = async () => {
		if (!input.trim()) {
			setError('Please paste your API key.');
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await onSave(input.trim());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="app">
			<div className="header">
				<BrandHeader />
			</div>
			<p className="lead">
				Paste your QRcodly API key below. Create keys at qrcodly.de → Settings → API Keys (Pro plan
				required).
			</p>
			<div className="field">
				<label>API Key</label>
				<input
					className="input"
					type="password"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="qr_live_…"
					autoFocus
				/>
			</div>
			{error && <p className="error">{error}</p>}
			<Button variant="primary" onClick={save} disabled={saving}>
				{saving ? 'Saving…' : 'Connect'}
			</Button>
		</div>
	);
}
