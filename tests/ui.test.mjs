import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HorizonOrb} from '../dist/index.js';
import {createHorizonOrb} from '../dist/vanilla.js';
import {normalizeLevel} from '../dist/state.js';
test('SSR UI is inert and contains no recording controls',()=>{
  const html=renderToStaticMarkup(createElement(HorizonOrb,{assetBaseUrl:'/authorized-renderer/'}));
  assert.match(html,/role="img"/);assert.doesNotMatch(html,/<button|<input|<audio|<script|<iframe/);
});
test('renderer is explicitly supplied, never bundled or auto-discovered',()=>{
  assert.throws(()=>createHorizonOrb(null,{}),/separately authorized renderer/);
});
test('level sanitation is bounded and finite',()=>{
  assert.equal(normalizeLevel(NaN),0);assert.equal(normalizeLevel(-1),0);assert.equal(normalizeLevel(2),1);assert.equal(normalizeLevel(.5),.5);
});
test('source imports remain local or React, with no recovered asset payloads',()=>{
  for(const file of fs.readdirSync(new URL('../src/',import.meta.url))){
    assert.ok(/\.(tsx?|css)$/.test(file));
    const text=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(text,/chatgpt\.com|conversation-small|horizon-dynamics|live-pipeline|#version 300 es|base64|watercolor-/);
    for(const [,specifier] of text.matchAll(/from\s+['"]([^'"]+)['"]/g))assert.ok(specifier==='react'||/^\.\/[a-z]+\.js$/.test(specifier),specifier);
  }
});
