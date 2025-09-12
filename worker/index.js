import * as jose from "jose"; // JWT library

function withCors(response) {
  return new Response(response.body, {
    ...response,
    headers: {
      ...Object.fromEntries(response.headers),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

const JWT_SECRET = new TextEncoder().encode("YOUR_SECRET_KEY");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------------
    // Handle OPTIONS
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
    // Register
    // ------------------------
    if (url.pathname === "/api/register" && request.method === "POST") {
      try {
        const { username, password } = await request.json();
        if (!username || !password)
          return withCors(
            new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })
          );

        const pwBuffer = new TextEncoder().encode(password);
        const hashedBuffer = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashedPassword = btoa(
          String.fromCharCode(...new Uint8Array(hashedBuffer))
        );

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

        if (!user)
          return withCors(
            new Response(JSON.stringify({ error: "User not found" }), { status: 404 })
          );

        const pwBuffer = new TextEncoder().encode(password);
        const hashedBuffer = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashedPassword = btoa(
          String.fromCharCode(...new Uint8Array(hashedBuffer))
        );

        if (hashedPassword !== user.password)
          return withCors(
            new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 })
          );

        const token = await new jose.SignJWT({ username })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime("1h")
          .sign(JWT_SECRET);

        return withCors(
          new Response(JSON.stringify({ success: true, token }), { status: 200 })
        );
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // Local DB Search (JWT-protected)
    // ------------------------
    if (url.pathname === "/api/search" && request.method === "GET") {
      try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader)
          return withCors(
            new Response(JSON.stringify({ error: "Missing token" }), { status: 401 })
          );

        const token = authHeader.split(" ")[1];
        try {
          await jose.jwtVerify(token, JWT_SECRET);
        } catch {
          return withCors(
            new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 })
          );
        }

        const q = url.searchParams.get("q") || "";
        const rows = await env.DB.prepare(
          "SELECT * FROM items WHERE name LIKE ? OR description LIKE ?"
        ).bind(`%${q}%`, `%${q}%`).all();

        return withCors(
          new Response(JSON.stringify({ results: rows.results }), {
            headers: { "Content-Type": "application/json" }
          })
        );
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // TCGdex Search (by name)
    // ------------------------
    if (url.pathname === "/api/tcgdex" && request.method === "GET") {
      try {
        const q = url.searchParams.get("q") || "charizard";

        const res = await fetch(
          `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(q)}`
        );
        const data = await res.json();

        return withCors(
          new Response(JSON.stringify({ results: data.data || [] }), {
            headers: { "Content-Type": "application/json" }
          })
        );
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // ------------------------
    // TCGdex Random Card
    // ------------------------
    if (url.pathname === "/api/tcgdex/random" && request.method === "GET") {
      try {
        const res = await fetch("https://api.tcgdex.net/v2/en/cards?limit=100");
        const data = await res.json();
        const cards = data.data || [];
        if (!cards.length)
          return withCors(
            new Response(JSON.stringify({ error: "No cards found" }), { status: 404 })
          );

        const randomCard = cards[Math.floor(Math.random() * cards.length)];

        return withCors(
          new Response(JSON.stringify({ card: randomCard }), {
            headers: { "Content-Type": "application/json" }
          })
        );
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    return withCors(new Response("Not found", { status: 404 }));
  }
};
