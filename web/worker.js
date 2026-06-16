export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Strip /dist/ prefix — assets are served from ./dist at root
    if (url.pathname.startsWith('/dist/')) {
      url.pathname = url.pathname.slice(5);
      request = new Request(url, request);
    }
    return env.ASSETS.fetch(request);
  }
};
