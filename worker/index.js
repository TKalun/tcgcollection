function withCors(response) {
  return new Response(response.body, {
    ...response,
    headers: {
      ...Object.fromEntries(response.headers),
      "Access-Control-Allow-Origin": "*", // replace * with your Pages domain if you want stricter security
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle preflight requests (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // Handle user registration
    if (url.pathname === "/api/register" && request.method === "POST") {
      try {
        const { username, password } = await request.json();

        if (!username || !password) {
          return withCors(new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 }));
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const pwBuffer = new TextEncoder().encode(password);
        const hashedBuffer = await crypto.subtle.digest("SHA-256", pwBuffer);
        const hashedPassword = btoa(String.fromCharCode(...new Uint8Array(hashedBuffer)));

        await env.DB.prepare(
          "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)"
        ).bind(username, hashedPassword, btoa(String.fromCharCode(...salt))).run();

        return withCors(new Response(JSON.stringify({ success: true }), { status: 200 }));
      } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
      }
    }

    // Handle login
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const { username, password } = await request.json();

        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE username = ?"
        ).bind(username).first();

        if (!user) {
          return withCors(new Response(JSON.stringify({ error: "User not found" }), { status: 404 }));
        }

        // Verify password
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

    return withCors(new Response("Not found", { status: 404 }));
  }
};
