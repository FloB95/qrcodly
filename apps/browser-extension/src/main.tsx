import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App onReady={showApp} />);

function showApp() {
	const splash = document.getElementById('splash');
	const rootEl = document.getElementById('root');
	if (splash) splash.classList.add('hidden');
	if (rootEl) rootEl.classList.add('ready');
	// Remove splash from DOM after fade
	setTimeout(() => splash?.remove(), 300);
}
