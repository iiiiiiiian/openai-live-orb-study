# External renderer contract

The UI library delegates rendering to a same-origin directory with `frame.html`. This repository's runnable demo supplies that provider in `demo/authorized-renderer/`. Each instance loads `frame.html?channel=<random UUID>` in a dedicated iframe. Renderer provenance and license scope are documented separately in `NOTICE.md`.

Both sides must verify `event.source`, exact same-origin `event.origin` and matching `channel`. Do not use `*` as targetOrigin. The provider reads channel from its URL and communicates only with its parent.

## Provider → UI

```ts
{channel, type: 'ready'}                 // initialization complete
{channel, type: 'rendered'}              // acknowledge each completed frame
{channel, type: 'error', message: string}
```

## UI → provider

```ts
{channel, type: 'frame', frame: {
  time: number,             // logical milliseconds; paused/background time excluded
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'disconnected',
  level: number,            // normalized scalar, NOT PCM/FFT
  width: number, height: number, // DPR-adjusted backing dimensions, capped at4096
  reducedMotion: boolean
}}
{channel, type: 'dispose'}
```

Only one frame is in flight. A provider must acknowledge a frame even if it chose not to redraw; otherwise the UI will wait. Initialization timeout is15 seconds. This transport is copied from the authored UI adapter, not a protocol claimed to originate from ChatGPT.

On dispose, release your resources; also handle document/page teardown because iframe removal can precede receipt of the dispose message. The UI owns only its container/iframe/listeners/RAF. The caller owns any supplied analyser/audio graph. The provider manages canvas, shaders, textures and GPU resources. This protocol does not grant a license to third-party rendering materials.

No arbitrary shader/source/asset URLs are accepted from captured traces. This is not the runtime-parity toolkit or a page-instrumentation protocol.
