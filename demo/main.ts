import {createHorizonOrb} from '../src/vanilla';
import '../src/orb.css';

const host = document.querySelector<HTMLElement>('#orb')!;
const orb = createHorizonOrb(host, {
  assetBaseUrl: new URL('./authorized-renderer/', document.baseURI),
  state: 'listening',
  audioLevel: 0,
  onError(error) {
    host.dataset.renderer = 'error';
    console.error(error);
  },
});
orb.ready.then(() => { host.dataset.renderer = 'ready'; }).catch(() => {});
window.addEventListener('pagehide', () => orb.dispose(), {once: true});
if (import.meta.hot) import.meta.hot.dispose(() => orb.dispose());
