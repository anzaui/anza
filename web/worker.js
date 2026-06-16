export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Strip /dist/ prefix for built asset paths
    if (url.pathname.startsWith('/dist/')) {
      url.pathname = url.pathname.slice(5);
      const res = await env.ASSETS.fetch(new Request(url, request));
      return new Response(res.body, {
        status: res.status,
        headers: { ...Object.fromEntries(res.headers), 'X-Anza': 'dist-asset' }
      });
    }

    // 2. Any path with a file extension is a real static file
    if (url.pathname.includes('.')) {
      const res = await env.ASSETS.fetch(request);
      return new Response(res.body, {
        status: res.status,
        headers: { ...Object.fromEntries(res.headers), 'X-Anza': 'static-file' }
      });
    }

    // 3. Everything else is an SPA route — serve the shell
    const res = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    return new Response(res.body, {
      status: res.status,
      headers: { ...Object.fromEntries(res.headers), 'X-Anza': 'spa-shell' }
    });
  }
};
