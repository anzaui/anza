((m,b)=>{for(const[k,v]of[["./index.css",":host{display:block}"],["./template.tags.json",{"attrs":["ref"],"classes":[],"compound":[],"ids":[],"refTypes":{"action":"HTMLButtonElement","msg":"HTMLElement"},"refs":["action","msg"],"tags":["button","p"],"version":1}]])m.set(new URL(k,b).href,v)})(globalThis.__anzaInline??=new Map(),import.meta.url);
import { page } from '@anzaui/anza/ui';

// A page module as `anza build` emits it for a pre-rendered (SSG) page. The
// prelude line above must equal a real build's output byte for byte
// (tools/tests/page_tags.rs checks it). The HTML stays a file.
export const mounts = [];

page('/__built_page/match', {
  tag: 'x-built-page-match',
  template: { html: './template.html' },
  style: ['./index.css'],
  on: {
    connect({ refs }) {
      mounts.push(refs.msg?.textContent ?? null);
    }
  }
}, import.meta.url);
