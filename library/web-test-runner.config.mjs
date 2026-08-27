/**
 * web-test-runner.config.mjs
 *
 * Injects browser-native import maps so tests use the same @anzaui/anza/*
 * specifiers a real consumer would use after npm install.
 */

export default {
  concurrency: 1,
  files: 'tests/**/*.test.js',
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: '2000'
    }
  },
  testRunnerHtml: (testFramework) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <script type="importmap">
          {
            "imports": {
              "@anzaui/anza":             "/src/index.js",
              "@anzaui/anza/api":         "/src/core/api/index.js",
              "@anzaui/anza/state":       "/src/core/state/index.js",
              "@anzaui/anza/events":      "/src/core/events/index.js",
              "@anzaui/anza/router":      "/src/core/router/index.js",
              "@anzaui/anza/storage":     "/src/core/storage/index.js",
              "@anzaui/anza/offline":     "/src/core/offline/index.js",
              "@anzaui/anza/animations":  "/src/core/animations/index.js",
              "@anzaui/anza/workers":     "/src/core/workers/index.js",
              "@anzaui/anza/security":    "/src/core/security/index.js",
              "@anzaui/anza/platform":    "/src/core/platform/index.js",
              "@anzaui/anza/ui":          "/src/core/ui/index.js",
              "@anzaui/anza/elements":    "/src/elements/index.js",
              "@anzaui/anza/elements/dialog":   "/src/elements/overlay/dialog/index.js",
              "@anzaui/anza/elements/popover":  "/src/elements/overlay/popover/index.js",
              "@anzaui/anza/elements/tooltip":  "/src/elements/overlay/tooltip/index.js"
            }
          }
        </script>
        <script type="module" src="${testFramework}"></script>
      </head>
      <body>
        <main id="main"></main>
      </body>
    </html>
  `
};
