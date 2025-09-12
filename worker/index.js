import { tcgdex } from "@tcgdex/sdk"; // SDK import

function withCors(response) {
  return new Response(response.body, {
    ...response,
    headers: {
      ...Object.fromEntries(response.headers),
      "Access-Control-Allow-Origin": "*", // 🔒 replace * with your Pages domain for more security
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------------
    // Handle preflight requests
    // ------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // ------------------------
    // Registration
    // ------------------------
    if (url.pathname === "/api/register" && request.method === "POST") {
      try {
        const { username, password } = await request.json();

        if (!username || !password) {
          return withCors(new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 }));
        }

        const pwBuffer = new TextEncoder().encode(password);
        const hashedBuffer = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashedPassword = btoa(String.fromCharCode(...new Uint8Array(hashedBuffer)));

        await env.DB.prepare(
          "INSERT INTO users (username, password) VALUES (?, ?)"
        ).bind(username, hashedPassword).run();

        return withCors(new Response(JSON.stringify({ success: true }), { status: 200 }));
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // Login
    // ------------------------
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const { username, password } = await request.json();

        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ?"
        ).bind(username).first();

        if (!user) {
          return withCors(new Response(JSON.stringify({ error: "User not found" }), { status: 404 }));
        }

        const pwBuffer = new TextEncoder().encode(password);
        const hashedBuffer = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashedPassword = btoa(String.fromCharCode(...new Uint8Array(hashedBuffer)));

        if (hashedPassword !== user.password) {
          return withCors(new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 }));
        }

        return withCors(new Response(JSON.stringify({ success: true, message: "Login successful" }), { status: 200 }));
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // Local DB Search
    // ------------------------
    if (url.pathname === "/api/search" && request.method === "GET") {
      try {
        const q = url.searchParams.get("q") || "";
        const rows = await env.DB.prepare(
          "SELECT * FROM items WHERE name LIKE ? OR description LIKE ?"
        ).bind(`%${q}%`, `%${q}%`).all();

        return withCors(new Response(JSON.stringify({ results: rows.results }), {
          headers: { "Content-Type": "application/json" }
        }));
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // TCGdex Search (SDK + fallback REST)
    // ------------------------
    if (url.pathname === "/api/tcgdex" && request.method === "GET") {
      try {
        const q = url.searchParams.get("q") || "charizard";
        let results;

        try {
          // Try SDK first
          const api = tcgdex("en");
          results = await api.cards.find(q);
        } catch (sdkErr) {
          // Fallback to raw REST API if SDK fails
          const res = await fetch(`https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(q)}`);
          results = await res.json();
        }

        return withCors(new Response(JSON.stringify({ results }), {
          headers: { "Content-Type": "application/json" }
        }));
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // Fallback
    // ------------------------
    return withCors(new Response("Not found", { status: 404 }));
  }
};
