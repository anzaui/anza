/**
 * web-test-runner.config.mjs
 *
 * Injects browser-native import maps so tests use the same @adukiorg/anza/*
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
              "@adukiorg/anza":             "/src/index.js",
              "@adukiorg/anza/api":         "/src/core/api/index.js",
              "@adukiorg/anza/state":       "/src/core/state/index.js",
              "@adukiorg/anza/events":      "/src/core/events/index.js",
              "@adukiorg/anza/router":      "/src/core/router/index.js",
              "@adukiorg/anza/storage":     "/src/core/storage/index.js",
              "@adukiorg/anza/offline":     "/src/core/offline/index.js",
              "@adukiorg/anza/animations":  "/src/core/animations/index.js",
              "@adukiorg/anza/workers":     "/src/core/workers/index.js",
              "@adukiorg/anza/security":    "/src/core/security/index.js",
              "@adukiorg/anza/platform":    "/src/core/platform/index.js",
              "@adukiorg/anza/ui":          "/src/core/ui/index.js",
              "@adukiorg/anza/elements":    "/src/elements/index.js",
              "@adukiorg/anza/elements/dialog":   "/src/elements/overlay/dialog/index.js",
              "@adukiorg/anza/elements/popover":  "/src/elements/overlay/popover/index.js",
              "@adukiorg/anza/elements/tooltip":  "/src/elements/overlay/tooltip/index.js"
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
