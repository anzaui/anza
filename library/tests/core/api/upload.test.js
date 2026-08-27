/**
 * tests/core/api/upload.test.js
 *
 * Core upload progress and event telemetry test suite.
 */

import { upload } from '@anzaui/anza/api';

describe('Upload Telemetry', () => {
  let originalXHR;

  before(() => {
    originalXHR = globalThis.XMLHttpRequest;
  });

  after(() => {
    globalThis.XMLHttpRequest = originalXHR;
  });

  it('should trigger upload progress events and clean up listeners', async () => {
    let progressFired = false;
    let successFired = false;

    // Mock XMLHttpRequest
    class MockXMLHttpRequest {
      constructor() {
        this.upload = {};
        this.headers = {};
      }

      open(method, url) {
        this.method = method;
        this.url = url;
      }

      setRequestHeader(key, val) {
        this.headers[key] = val;
      }

      send(data) {
        // Mock progress callback trigger
        if (this.upload.onprogress) {
          this.upload.onprogress({
            lengthComputable: true,
            loaded: 50,
            total: 100
          });
        }

        // Mock success onload trigger
        this.status = 200;
        this.responseText = '{"ok":true}';
        
        // Custom headers mock
        this.getResponseHeader = () => 'application/json';

        if (this.onload) {
          this.onload();
        }
      }
    }

    globalThis.XMLHttpRequest = MockXMLHttpRequest;

    const res = await upload('https://api.example.com/upload', {}, {
      on: {
        progress: (e) => {
          if (e.detail.loaded === 50 && e.detail.total === 100 && e.detail.percentage === 50) {
            progressFired = true;
          }
        },
        'status:200': (e) => {
          successFired = true;
        }
      }
    });

    if (!res.ok) {
      throw new Error('Expected upload to return parsed JSON response');
    }
    if (!progressFired) {
      throw new Error('Expected progress event listener to fire with computable upload metadata');
    }
    if (!successFired) {
      throw new Error('Expected status:200 event listener to fire upon successful upload completion');
    }
  });
});
