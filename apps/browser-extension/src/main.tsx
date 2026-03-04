import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const MIN_SPLASH_MS = 1500;
const splashStart = Date.now();

const root = createRoot(document.getElementById('root')!);
root.render(<App onReady={showApp} />);

function showApp() {
	const elapsed = Date.now() - splashStart;
	const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);

	setTimeout(() => {
		const splash = document.getElementById('splash');
		const rootEl = document.getElementById('root');
		if (splash) splash.classList.add('hidden');
		if (rootEl) rootEl.classList.add('ready');
		// Remove splash from DOM after fade
		setTimeout(() => splash?.remove(), 300);
	}, remaining);
}
