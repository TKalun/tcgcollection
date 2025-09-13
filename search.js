// ------------------------
// Import TCGdex SDK
// ------------------------
import TCGdex, { Query } from 'https://unpkg.com/@tcgdex/sdk?module';
const tcgdex = new TCGdex("en");

console.log("TCGdex SDK loaded:", tcgdex);

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------
  // Local DB search
  // ------------------------
  const searchForm = document.getElementById("searchForm");
  const searchQueryInput = document.getElementById("searchQuery");
  const resultsDiv = document.getElementById("results");
  
  searchForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!searchQueryInput || !resultsDiv) return;

    const q = searchQueryInput.value.trim();
    resultsDiv.innerHTML = "<p>Searching local DB...</p>";

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        headers: { "Authorization": "Bearer " + (localStorage.getItem("token") || "") }
      });
      if (!res.ok) throw new Error(`DB error: ${res.status}`);
      const data = await res.json();

      if (!data.results || !data.results.length) {
        resultsDiv.innerHTML = `<p>No results found in local DB for "${q}".</p>`;
        return;
      }

      resultsDiv.innerHTML = data.results.map(r => `
        <div class="card">
          <p><strong>${r.name || "No Name"}</strong></p>
          <p>ID: ${r.id || "N/A"}</p>
        </div>
      `).join("");
    } catch (err) {
      resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  });

  // ------------------------
  // TCGdex card search
  // ------------------------
  const searchBtn = document.getElementById("searchBtn");
  const cardQueryInput = document.getElementById("cardQuery");

  searchBtn?.addEventListener("click", async () => {
    if (!cardQueryInput || !resultsDiv) return;
    const queryVal = cardQueryInput.value.trim();
    resultsDiv.innerHTML = "<p>Searching...</p>";
    console.log("Search query:", queryVal);

    try {
      let results = [];
      let card = null;

      // Try fetching by exact ID first
      try {
        card = await tcgdex.card.get(queryVal);
        if (card) results.push(card);
      } catch (err) {
        console.log("Not an exact ID, trying name search...");
      }

      // If no card found by ID, search by name
      if (results.length === 0) {
        results = await tcgdex.card.list(new Query().equal("name", queryVal));
        console.log("SDK response:", results);
      }

      if (!results || results.length === 0) {
        resultsDiv.innerHTML = `<p>No cards found for "${queryVal}"</p>`;
        return;
      }

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
              <p><strong>Types:</strong> ${(c.types && c.types.length ? c.types.join(", ") : "N/A")}</p>
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
