((m,b)=>{for(const[k,v]of[["./index.css",":host{display:block}"],["./template.tags.json",{"attrs":["ref"],"classes":[],"compound":[],"ids":[],"refTypes":{"action":"HTMLButtonElement","msg":"HTMLElement"},"refs":["action","msg"],"tags":["button","p"],"version":1}]])m.set(new URL(k,b).href,v)})(globalThis.__anzaInline??=new Map(),import.meta.url);
import { page } from '@anzaui/anza/ui';

// Same built page module as ../match, under another tag (see there).
export const mounts = [];

page('/__built_page/stale', {
  tag: 'x-built-page-stale',
  template: { html: './template.html' },
  style: ['./index.css'],
  on: {
    connect({ refs }) {
      mounts.push(refs.msg?.textContent ?? null);
    }
  }
}, import.meta.url);
