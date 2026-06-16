export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Strip /dist/ prefix for built asset paths
    if (url.pathname.startsWith('/dist/')) {
      url.pathname = url.pathname.slice(5);
      return env.ASSETS.fetch(new Request(url, request));
    }

    // 2. Any path with a file extension is a real static file
    if (url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // 3. Everything else is an SPA route — serve the shell
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  }
};
