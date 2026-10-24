import { useState, type FormEvent } from 'react';
import {
	ArrowTopRightOnSquareIcon,
	EyeIcon,
	EyeSlashIcon,
	KeyIcon,
	LockClosedIcon,
	SparklesIcon,
} from '@heroicons/react/24/outline';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/Spinner';

const API_KEYS_URL = 'https://www.qrcodly.de/dashboard/settings/api-keys';

type Props = {
	initialKey: string | null;
	onSave: (key: string) => Promise<void>;
	loadError?: string | null;
};

export function SettingsScreen({ initialKey, onSave, loadError }: Props) {
	const [input, setInput] = useState(initialKey ?? '');
	const [revealed, setRevealed] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const save = async (event: FormEvent) => {
		event.preventDefault();
		if (!input.trim()) {
			setError('Please paste your API key.');
			return;
		}
		setError(null);
		setSaving(true);
		try {
			await onSave(input.trim());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to connect');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="app">
			<main className="onboarding">
				<span className="onboarding-logo">
					<Logo size={30} />
				</span>
				<h1 className="title">Connect QRcodly</h1>
				<p className="lead">Browse, create and place your QR codes without leaving Figma.</p>

				<form className="card onboarding-form" onSubmit={save}>
					<label className="label" htmlFor="api-key">
						API key
					</label>
					<div className="input-group">
						<KeyIcon className="input-icon" />
						<input
							id="api-key"
							className="input has-icon has-action"
							type={revealed ? 'text' : 'password'}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							autoComplete="off"
							spellCheck={false}
							autoFocus
						/>
						<button
							type="button"
							className="input-action"
							onClick={() => setRevealed((value) => !value)}
							aria-label={revealed ? 'Hide API key' : 'Show API key'}
							title={revealed ? 'Hide API key' : 'Show API key'}
						>
							{revealed ? <EyeSlashIcon /> : <EyeIcon />}
						</button>
					</div>
					{loadError && !error && <p className="alert">Could not read stored key: {loadError}</p>}
					{error && <p className="alert">{error}</p>}
					<button type="submit" className="btn btn-primary btn-block" disabled={saving}>
						{saving && <Spinner />}
						{saving ? 'Connecting…' : 'Connect'}
					</button>
					<a className="link" href={API_KEYS_URL} target="_blank" rel="noreferrer">
						Create an API key
						<ArrowTopRightOnSquareIcon />
					</a>
				</form>

				<span className="pro-badge">
					<SparklesIcon />
					Requires a QRcodly Pro plan
				</span>
				<p className="security-note">
					<LockClosedIcon />
					Your key is stored only on this device and is never saved into your Figma files.
				</p>
			</main>
		</div>
	);
}
