import { SignJWT } from "jose";

// 🔹 NEW: Web Crypto password hash function
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

// 🔹 NEW: Random salt generator
function generateSalt() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // 🔹 NEW: Login endpoint
    if (url.pathname === "/api/login" && req.method === "POST") {
      const { username, password } = await req.json();

      // 🔹 Fetch user from D1
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE username = ?"
      ).bind(username).first();

      if (!user) return new Response("User not found", { status: 404 });

      // 🔹 Verify password using Web Crypto hash
      const hashedAttempt = await hashPassword(password, user.salt);
      if (hashedAttempt !== user.password) {
        return new Response("Invalid password", { status: 401 });
      }

      // 🔹 Issue JWT token
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const token = await new SignJWT({ sub: user.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      return new Response(JSON.stringify({ token }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
