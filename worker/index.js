import { SignJWT, jwtVerify } from "jose";

// 🔹 Web Crypto password hashing
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100_000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const rawKey = await crypto.subtle.exportKey("raw", key);
  return Buffer.from(rawKey).toString("hex");
}

// 🔹 Random salt generator
function generateSalt() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// 🔹 Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or "https://kaluntcgcollection.pages.dev/"
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // 🔹 Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 🔹 Registration endpoint
    if (url.pathname === "/api/register" && req.method === "POST") {
      const { username, password } = await req.json();

      if (!username || !password) {
        return new Response("Missing username or password", { status: 400, headers: corsHeaders });
      }

      const salt = generateSalt();
      const hashed = await hashPassword(password, salt);

      try {
        await env.DB.prepare(
          "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)"
        ).bind(username, hashed, salt).run();

        return new Response("User registered successfully", { headers: corsHeaders });
      } catch (err) {
        if (err.message.includes("UNIQUE")) {
          return new Response("Username already exists", { status: 409, headers: corsHeaders });
        }
        return new Response("Registration error: " + err.message, { status: 500, headers: corsHeaders });
      }
    }

    // 🔹 Login endpoint
    if (url.pathname === "/api/login" && req.method === "POST") {
      const { username, password } = await req.json();

      if (!username || !password) {
        return new Response("Missing username or password", { status: 400, headers: corsHeaders });
      }

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE username = ?"
      ).bind(username).first();

      if (!user) return new Response("User not found", { status: 404, headers: corsHeaders });

      const hashedAttempt = await hashPassword(password, user.salt);
      if (hashedAttempt !== user.password) {
        return new Response("Invalid password", { status: 401, headers: corsHeaders });
      }

      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const token = await new SignJWT({ sub: user.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 🔹 Search endpoint (JWT-protected)
    if (url.pathname === "/api/search" && req.method === "GET") {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

      const token = auth.split(" ")[1];
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        await jwtVerify(token, secret);
      } catch {
        return new Response("Invalid token", { status: 401, headers: corsHeaders });
      }

      const q = url.searchParams.get("q") || "";
      const items = await env.DB.prepare("SELECT * FROM items WHERE name LIKE ?")
        .bind(`%${q}%`)
        .all();

      return new Response(JSON.stringify(items.results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};
