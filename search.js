// ------------------------
// Import TCGdex SDK
// ------------------------
import { TCGdex, Query } from "https://cdn.skypack.dev/@tcgdex/sdk";

// Initialize TCGdex client
const tcgdex = new TCGdex("en");

// ------------------------
// Local DB search
// ------------------------
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = document.getElementById("searchQuery").value.trim();
  const resultsDiv = document.getElementById("results");
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
        <p><strong>${r.name}</strong></p>
        <p>ID: ${r.id}</p>
      </div>
    `).join("");
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
});

// ------------------------
// TCGdex search (by Name or ID)
// ------------------------
document.getElementById("tcgIdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const queryVal = document.getElementById("tcgIdQuery").value.trim();
  const cardDiv = document.getElementById("cardResult");
  cardDiv.innerHTML = "<p>Searching TCGdex...</p>";

  try {
    let results = [];

    // Detect ID format like swsh3-136
    if (/^[a-z]+\d+-\d+$/i.test(queryVal)) {
      // Split into set + number
      const [setCode, number] = queryVal.split("-");
      const imgUrl = `https://assets.tcgdex.net/en/swsh/${setCode}/${number}/high.png`;

      results = [{
        id: queryVal,
        name: queryVal,
        set: { id: setCode, name: setCode.toUpperCase() },
        number,
        image: imgUrl
      }];
    } else {
      // Name search with SDK
      results = await tcgdex.card.list(new Query().equal("name", queryVal));
    }

    if (!results || results.length === 0) {
      cardDiv.innerHTML = `<p>No TCGdex cards found for "${queryVal}".</p>`;
      return;
    }

    // Render results
    cardDiv.innerHTML = results.map(card => {
      const imgUrl = card.image || `https://assets.tcgdex.net/en/${card.set.id}/${card.number}/high.png`;
      return `
        <div class="card">
          <img src="${imgUrl}" alt="${card.name}" />
          <h3>${card.name}</h3>
          <p><strong>Set:</strong> ${card.set?.name || "Unknown"}</p>
          <p><strong>ID:</strong> ${card.id || card.number}</p>
          <p><strong>Rarity:</strong> ${card.rarity || "N/A"}</p>
          <p><strong>HP:</strong> ${card.hp || "N/A"}</p>
          <p><strong>Types:</strong> ${(card.types || []).join(", ")}</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    cardDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
});
