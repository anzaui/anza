export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Strip /dist/ prefix for asset paths
    if (url.pathname.startsWith('/dist/')) {
      url.pathname = url.pathname.slice(5);
      return env.ASSETS.fetch(new Request(url, request));
    }

    // 2. Let real files through (e.g. /sw.js, /importmap.json)
    const ext = url.pathname.split('.').pop();
    const isAsset = ['js', 'css', 'json', 'html', 'svg', 'png', 'ico'].includes(ext);
    if (isAsset) {
      return env.ASSETS.fetch(request);
    }

    // 3. Everything else is a route — serve index.html for SPA routing
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  }
};
