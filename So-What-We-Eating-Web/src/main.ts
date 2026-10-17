import './styles/main.css';
import './styles/views.css';
import { createRuntime } from './providers/runtime.ts';
import { BrowserLocationService } from './location/LocationService.ts';
import { RecommendationEngine } from './recommendation/RecommendationEngine.ts';
import { LocalDatabase } from './storage/LocalDatabase.ts';
import { App } from './ui/App.ts';
import { button } from './ui/dom.ts';
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const mode = new URLSearchParams(location.search).get('mode') ?? import.meta.env.VITE_DISCOVERY_MODE;
const runtime = await createRuntime(mode, import.meta.env.VITE_RESTAURANT_PROXY_URL ?? '');
const app = new App(new LocalDatabase(base.pathname), new RecommendationEngine(runtime.restaurants, runtime.menus), new BrowserLocationService(), runtime.catalog, {
    mode: runtime.mode, configured: runtime.configured, lookup: runtime.restaurants.lookup?.bind(runtime.restaurants),
});
app.start();
function connectionStatus() {
    const node = document.querySelector<HTMLElement>('#connection-status')!;
    node.hidden = navigator.onLine;
    node.textContent = runtime.mode === 'demo' ? 'Offline. The explicit fixture demo still works.' : 'Offline. Your app and preferences are here; real restaurant discovery needs a connection.';
}
addEventListener('online', connectionStatus);
addEventListener('offline', connectionStatus);
connectionStatus();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    let controlled = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (controlled) {
            app.notice('A fresh version is ready.');
            document.querySelector('#notice')!.append(button('Reload to update', () => location.reload(), 'text-button'));
        }
        controlled = true;
    });
    navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' })
        .then(registration => document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible')
        void registration.update().catch(() => { }); }))
        .catch(() => app.notice('The app works, but offline shell support couldn’t be installed in this browser.'));
}
