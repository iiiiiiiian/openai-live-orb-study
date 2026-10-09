import { createLiveRenderer } from './frozen/live-renderer.mjs';
import { HorizonFrameGenerator } from './frozen/live-pipeline.mjs';
import { StateAdapter } from './state.js';
// Dedicated document isolates the frozen #replay selector and relative fetches.
const channel = new URL(location.href).searchParams.get('channel');
const notify = (type, extra = {}) => parent.postMessage({ channel, type, ...extra }, location.origin);
let renderer;
let disposed = false;
const adapter = new StateAdapter();
const generator = new HorizonFrameGenerator();
const cleanup = () => { disposed = true; renderer?.dispose(); };
window.addEventListener('pagehide', cleanup, { once: true });
window.addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== channel)
        return;
    if (event.data.type === 'dispose') {
        cleanup();
        return;
    }
    if (event.data.type !== 'frame' || !renderer || disposed)
        return;
    try {
        const frame = event.data.frame;
        generator.options.reducedMotion = frame.reducedMotion;
        const snapshot = adapter.snapshot(frame.state, frame.level, frame.time);
        const uniforms = generator.frame(frame.time, snapshot);
        renderer.render(uniforms, frame.width, frame.height, .65);
        notify('rendered');
    }
    catch (error) {
        notify('error', { message: String(error) });
    }
});
try {
    renderer = await createLiveRenderer();
    if (disposed)
        renderer.dispose();
    else
        notify('ready');
}
catch (error) {
    notify('error', { message: String(error) });
}
