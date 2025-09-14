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


// ------------------------
// TCGdex card search (Grid Gallery)
// ------------------------
document.addEventListener("DOMContentLoaded", () => { 
  const searchForm = document.getElementById("tcgIdForm");
  const cardQueryInput = document.getElementById("tcgIdQuery");
  const resultsDiv = document.getElementById("cardResult");

  searchForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cardQueryInput || !resultsDiv) return;

    const queryVal = cardQueryInput.value.trim();
    resultsDiv.innerHTML = "<p>Searching...</p>";
    console.log("Search query:", queryVal);

    try {
      let results = [];

      // Try exact ID search first
      try {
        const card = await tcgdex.card.get(queryVal);
        if (card) results = [card]; // wrap single card
      } catch (err) {
        console.log("Not an exact ID, trying name search...");
      }

      // Fallback to name search
      if (results.length === 0) {
        results = await tcgdex.card.list(new Query().equal("name", queryVal));
        console.log("SDK response:", results);
      }

      if (!results || results.length === 0) {
        resultsDiv.innerHTML = `<p>No cards found for "${queryVal}"</p>`;
        return;
      }

      // Render all results in grid
      resultsDiv.innerHTML = results
        .map(c => {
          const imgUrl = c.getImageURL ? c.getImageURL("high", "png") : "";
          return `
            <div class="card">
              ${imgUrl ? `<img src="${imgUrl}" alt="${c.name || "Unknown"}" />` : ""}
              <h3>${c.name || "Unknown Name"}</h3>
              <p><strong>Set:</strong> ${c.set?.name || "Unknown"}</p>
              <p><strong>ID:</strong> ${c.id || c.number || "N/A"}</p>
              <p><strong>Rarity:</strong> ${c.rarity || "N/A"}</p>
              <p><strong>HP:</strong> ${c.hp || "N/A"}</p>
              <p><strong>Types:</strong> ${(c.types?.length ? c.types.join(", ") : "N/A")}</p>
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


