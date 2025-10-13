module.exports = {
  '/rest': {
    target: 'http://localhost:3000', // Default target (fallback)
    changeOrigin: true,
    secure: false,
    configure: (proxy, options) => {
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        // Get the Origin or Host header from the incoming request
        const origin = req.headers.origin || `http://${req.headers.host}` || '';
        console.log('Origin/Header:', origin);

        // Parse the origin to extract the hostname
        let hostname;
        try {
          hostname = new URL(origin).hostname; // e.g., 'localhost' or 'sub.localhost'
        } catch (e) {
          console.error('Invalid origin:', origin);
          hostname = 'localhost'; // Fallback
        }

        // Set the target with the same hostname but port 3000
        const target = `http://${hostname}:3000`;

        // Update the proxy request's Host header and path
        proxyReq.setHeader('Host', `${hostname}:3000`);
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
