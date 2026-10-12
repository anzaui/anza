/**
 * tests/core/root-exports.test.js
 *
 * Names exported by several core modules must still reach the root entry
 * (`export *` alone would drop them) and come from the chosen winner (D13).
 */

import * as root from '@anzaui/anza';
import * as state from '@anzaui/anza/state';
import * as storage from '@anzaui/anza/storage';
import * as events from '@anzaui/anza/events';
import * as ui from '@anzaui/anza/ui';
import * as router from '@anzaui/anza/router';

const WINNERS = [
  ['state', state],
  ['sync', state],
  ['storage', storage],
  ['events', events],
  ['view', ui],
  ['cache', router],
  ['reset', router]
];

describe('Root exports (D13)', () => {
  for (const [name, mod] of WINNERS) {
    it(`exports ${name} from its winning module`, () => {
      if (root[name] === undefined) throw new Error(`${name} is missing from @anzaui/anza`);
      if (root[name] !== mod[name]) throw new Error(`${name} does not come from the winning module`);
    });
  }
});
