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
    // Local DB search
    // ------------------------
    if (path === "/api/search" && method === "GET") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

      const q = url.searchParams.get("q") || "";
      try {
        const stmt = await env.DB.prepare("SELECT * FROM cards WHERE name LIKE ?")
                                   .bind(`%${q}%`)
                                   .all();
        return new Response(JSON.stringify({ results: stmt.results }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // ------------------------
    // TCGdex search by name
    // ------------------------
    if (path === "/api/tcgdex" && method === "GET") {
      const q = url.searchParams.get("q") || "";
      try {
        const apiRes = await fetch(`https://api.tcgdex.net/cards?q=${encodeURIComponent(q)}`);
        const data = await apiRes.json();
        return new Response(JSON.stringify({ data: data.data || [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // ------------------------
    // TCGdex card by ID
    // ------------------------
    const cardIdMatch = path.match(/^\/api\/tcgdex\/card\/(.+)$/);
    if (cardIdMatch && method === "GET") {
      const cardId = cardIdMatch[1];
      try {
        const apiRes = await fetch(`https://api.tcgdex.net/cards/${encodeURIComponent(cardId)}`);
        const data = await apiRes.json();
        return new Response(JSON.stringify({ data: data }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
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
