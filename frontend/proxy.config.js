const backendPort = process.env.PORT || 3000;
console.log('Backend port:', backendPort);

module.exports = {
  '/rest': {
    target: `http://localhost:${backendPort}`, // Default target (fallback)
    changeOrigin: true,
    secure: false,
    configure: (proxy, options) => {
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        // Get the Origin or Host header from the incoming request
        const origin = req.headers.origin || `http://${req.headers.host}` || '';
        console.log('Origin/Header:', origin);

        // Parse the origin to extract the hostname
        let hostname;
        let requestUrl;
        try {
          requestUrl = new URL(origin); // e.g., 'localhost' or 'sub.localhost'
          hostname = requestUrl.hostname; // e.g., 'localhost' or 'sub.localhost'
        } catch (e) {
          console.error('Invalid origin:', origin);
          requestUrl = new URL('http://localhost');
          hostname = 'localhost'; // Fallback
        }

        // Set the target with the same hostname but port where the backend is running
        const target = `http://${hostname}:${backendPort}`;

        // Update the proxy request's Host header and path
        proxyReq.setHeader('Host', `${hostname}:${backendPort}`);
        proxyReq.setHeader('x-forwarded-port', requestUrl.port);
        proxyReq.path = req.url; // Preserve the original path
        options.target = target; // Update the target for this request
      });

      proxy.on('error', (err, req, res) => {
        console.error('Proxy error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error occurred.');
      });
    },
  },
};
