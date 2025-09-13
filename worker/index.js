export default {
  async fetch(req, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // ------------------------
    // Login
    // ------------------------
    if (path === "/api/login" && method === "POST") {
      try {
        const { username, password } = await req.json();
        if (!username || !password) {
          return new Response(JSON.stringify({ error: "Missing username or password" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const token = btoa(`${username}:${Date.now()}`);
        return new Response(JSON.stringify({ token }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // ------------------------
    // Local DB search (dynamic table)
    // ------------------------
    if (path === "/api/search" && method === "GET") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const q = url.searchParams.get("q") || "";
      const table = "users"; // change to your D1 table name

      try {
        // Check if table exists
        const tablesRes = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
                                       .bind(table)
                                       .all();
        if (!tablesRes.results.length) {
          return new Response(JSON.stringify({ error: `Table "${table}" does not exist in D1 database` }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        // Query table
        const stmt = await env.DB.prepare(`SELECT * FROM ${table} WHERE name LIKE ?`)
                                   .bind(`%${q}%`)
                                   .all();

        return new Response(JSON.stringify({ results: stmt.results }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // ------------------------
    // TCGdex card ID search (direct asset)
    // ------------------------
    const cardIdMatch = path.match(/^\/api\/tcgdex\/card\/(.+)$/);
    if (cardIdMatch && method === "GET") {
      const cardId = cardIdMatch[1];

      try {
        const [setCode, number] = cardId.split("-");
        if (!setCode || !number) throw new Error("Invalid card ID format");

        const imgUrl = `https://assets.tcgdex.net/en/swsh/${setCode}/${number}/high.png`;

        // Return JSON with card ID and image URL
        return new Response(JSON.stringify({
          cardId,
          imgUrl
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
