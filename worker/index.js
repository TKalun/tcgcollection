import bcrypt from 'bcryptjs';

// Simple JWT utilities using HMAC-SHA256 (Web Crypto)
async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  // base64url
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function base64urlEncode(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function base64urlDecode(input) {
  // not used in worker for payload decode, but included for completeness
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return atob(input);
}

async function createJwt(payload, secret, expiresInSec = 3600) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const body = { ...payload, exp };
  const message = base64urlEncode(header) + '.' + base64urlEncode(body);
  const sig = await hmacSign(message, secret);
  return message + '.' + sig;
}

async function verifyJwt(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sig] = parts;
  const message = headerB64 + '.' + bodyB64;
  const expectedSig = await hmacSign(message, secret);
  if (sig !== expectedSig) return null;
  const bodyJson = JSON.parse(atob(bodyB64.replace(/-/g,'+').replace(/_/g,'/')));
  if (bodyJson.exp && Math.floor(Date.now()/1000) > bodyJson.exp) return null;
  return bodyJson;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // POST /api/login
    if (pathname === '/api/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();
        if (!username || !password) return new Response('username & password required', { status: 400 });

        // Query D1 for user
        const row = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').bind(username).first();
        if (!row) return new Response('invalid credentials', { status: 401 });

        const correct = bcrypt.compareSync(password, row.password_hash);
        if (!correct) return new Response('invalid credentials', { status: 401 });

        const token = await createJwt({ sub: String(row.id), username: row.username }, env.JWT_SECRET, 60*60);
        return new Response(JSON.stringify({ token }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(err.message || 'login error', { status: 500 });
      }
    }

    // GET /api/search?q=...
    if (pathname === '/api/search' && request.method === 'GET') {
      try {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.replace('Bearer ', '');
        const payload = await verifyJwt(token, env.JWT_SECRET);
        if (!payload) return new Response('Unauthorized', { status: 403 });

        const q = url.searchParams.get('q') || '';
        // Simple search against name and description (SQL LIKE). Use parameter binding to avoid injection.
        const likeQ = '%' + q + '%';
        const resultsObj = await env.DB.prepare('SELECT id, name, description FROM items WHERE name LIKE ? OR description LIKE ? LIMIT 50')
                           .bind(likeQ, likeQ)
                           .all();
        return new Response(JSON.stringify(resultsObj.results || []), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(err.message || 'search error', { status: 500 });
      }
    }

    // For safety, return 404 for other paths
    return new Response('Not found', { status: 404 });
  }
}
