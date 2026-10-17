import './styles/main.css';
import './styles/views.css';
import { fixtureCatalog } from './catalog/loader.ts';
import { FixtureRestaurantProvider, FixtureMenuProvider } from './providers/FixtureProviders.ts';
import { BrowserLocationService } from './location/LocationService.ts';
import { RecommendationEngine } from './recommendation/RecommendationEngine.ts';
import { LocalDatabase } from './storage/LocalDatabase.ts';
import { App } from './ui/App.ts';
import { button } from './ui/dom.ts';
const base = new URL(import.meta.env.BASE_URL, document.baseURI);
const app = new App(new LocalDatabase(base.pathname), new RecommendationEngine(new FixtureRestaurantProvider(fixtureCatalog.restaurants), new FixtureMenuProvider(fixtureCatalog.menus)), new BrowserLocationService(), fixtureCatalog.restaurants);
app.start();
function connectionStatus() {
    const node = document.querySelector<HTMLElement>('#connection-status')!;
    node.hidden = navigator.onLine;
    node.textContent = 'Offline? Still hungry. The complete fixture demo works here. Live discovery will need a connection.';
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
        .then(registration => { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible')
        void registration.update().catch(() => { }); }); })
        .catch(() => app.notice('The demo works, but offline support couldn’t be installed in this browser.'));
}
