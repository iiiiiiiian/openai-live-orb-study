# Scope and provenance

## Project-authored integration

The UI in src/, public types, lifecycle and scalar-audio adapters, CSS, examples,
demo host, Vite configuration, build scripts, tests, and documentation are
project-authored integration work. The project-authored portions are covered by
the MIT license in LICENSE.

## Included visual renderer

This checkout now includes demo/authorized-renderer/. Earlier public revisions
contained only the UI host and required a separately supplied renderer.

The frame.html, frame.js, and state.js entry/adapters were copied from the local
full implementation's packages/horizon-orb/dist/. The 11 files in frozen/ were
copied from packages/horizon-orb/frozen/: five JavaScript modules, four GLSL
shaders, the renderer manifest, and watercolor-cxf1rp88.webp. They were checked
byte-for-byte against that source during migration.

The frozen renderer includes recovered or third-party-derived rendering code,
shader sources, texture data, and related metadata from the prior Horizon
visual study. Copying these files into this repository does not make them
project-original code or grant MIT rights to them. This project does not claim
ownership of that underlying material, or independently established permission
to redistribute or sublicense it. Its original rights remain with the
respective owners.

The renderer loads shaders and textures locally. Source URL strings retained
inside the manifest are provenance metadata, not instructions to fetch remote
assets. No additional resources were obtained from third-party sites during
this migration.

## Images and excluded materials

assets/local-orb.png is a screenshot of this repository's running demo.
Existing preview/reference images and third-party content depicted in screenshots
are not relicensed by the project's MIT grant.

Original application bundles, runtime captures, research traces, audio
recordings, models, browser profiles, cookies, credentials, and account data
are not part of this release.

OpenAI, ChatGPT, and related names and marks belong to their respective owners.
This is an independent, unofficial visual study, not OpenAI source code or an
official SDK. No full end-to-end ChatGPT Voice parity is claimed.
