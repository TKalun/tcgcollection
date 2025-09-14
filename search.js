// ------------------------
// Import TCGdex SDK
// ------------------------
import TCGdex, { Query } from 'https://unpkg.com/@tcgdex/sdk?module';
const tcgdex = new TCGdex("en");

console.log("TCGdex SDK loaded:", tcgdex);


const API_BASE = "https://cf-pages-worker-d1-app.thomasklai88.workers.dev";
const token = localStorage.getItem("token");

if (!token) {
  alert("You must log in first!");
  window.location.href = "index.html";
}

// Helper: Convert object to HTML list recursively
function renderObject(obj) {
  if (!obj || typeof obj !== 'object') return obj || '';
  return `<ul>` + Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) v = v.map(i => renderObject(i)).join('');
    else if (typeof v === "object") v = renderObject(v);
    return `<li><strong>${k}:</strong> <span class="field">${v}</span></li>`;
  }).join('') + `</ul>`;
}

// ------------------------
// Local DB search (D1 via Worker)
// ------------------------
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("searchQuery").value.trim();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "<p>Searching local database...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    resultsDiv.innerHTML = data.results?.length
      ? data.results.map(item => `<div class="item">${renderObject(item)}</div>`).join("")
      : "<p>No results found in local DB</p>";

  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:red;">Error fetching local DB: ${err.message}</p>`;
  }
});


// TCGdex card search (Grid Gallery + Partial Name Matches)
document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("tcgIdForm");
  const fieldSelect = document.getElementById("fieldSelect");
  const cardQueryInput = document.getElementById("tcgIdQuery");
  const resultsDiv = document.getElementById("cardResult");

  searchForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cardQueryInput || !resultsDiv) return;

    const queryVal = cardQueryInput.value.trim();
    const field = fieldSelect?.value || "name";
    resultsDiv.innerHTML = "<p>Searching...</p>";
    console.log(`Searching ${field} for "${queryVal}"`);

    try {
      // Step 1: Query lightweight list of cards
      let results = await tcgdex.card.list(new Query().like(field, queryVal));
      console.log("Lightweight results:", results);

      // Step 2: Fetch full card data for each result
      results = await Promise.all(
        results.map(async c => {
          try {
            const fullCard = await tcgdex.card.get(c.id);
            return fullCard || c; // fallback if get() fails
          } catch {
            return c;
          }
        })
      );

      // Step 3: Handle no results
      if (!results || results.length === 0) {
        resultsDiv.innerHTML = `<p>No cards found for "${queryVal}" in ${field}</p>`;
        return;
      }

      // Step 4: Render all results in grid gallery
      resultsDiv.innerHTML = results
        .map(c => {
          const imgUrl = c.getImageURL ? c.getImageURL("high", "png") : "";
        const tcgplayerPriceNorm = c.pricing?.tcgplayer?.normal?.marketPrice || "None";
        const tcgplayerPriceUnlimited = c.pricing?.tcgplayer?.unlimited?.marketPrice || "None";
        // const tcgplayerPriceReverse = c.pricing?.tcgplayer?.reverse-holofoil?.market || "None";
        // const weakness = c.weaknesses?.[0]?.type || "None";

          return `
            <div class="card">
              ${imgUrl ? `<img src="${imgUrl}" alt="${c.name || "Unknown"}" />` : ""}
              <h3>${c.name || "Unknown Name"}</h3>
              <p><strong>ID:</strong> ${c.id || c.number || "N/A"}</p>
              <p><strong>Set:</strong> ${c.set?.name || "Unknown"}</p>
              <p><strong>Rarity:</strong> ${c.rarity || "N/A"}</p>
              <p><strong>TCGPlayer Price - Normal:</strong> ${tcgplayerPriceNorm}</p>
              <p><strong>TCGPlayer Price - Unlimited:</strong> ${tcgplayerPriceUnlimited}</p>
              
            </div>
          `;
        })
        .join("");

    } catch (err) {
      console.error("Error fetching cards:", err);
      resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  });
});
