import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../src/orb.css',import.meta.url),new URL('../dist/orb.css',import.meta.url));
