console.log('[trace] index.js: loading serverless-http');
import serverless from 'serverless-http';
console.log('[trace] index.js: loading app.js');
import app from './_lib/app.js';
console.log('[trace] index.js: wrapping app with serverless-http');

const handler = serverless(app);

export default async function (req, res) {
  console.log('[trace] handler invoked:', req.method, req.url);
  await handler(req, res);
  console.log('[trace] handler finished:', req.method, req.url);
}
