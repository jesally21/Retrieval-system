const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/api/admin-user-management',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
    }),
  );
  app.use(
    '/api/document-request-management',
    createProxyMiddleware({
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
    }),
  );
};
