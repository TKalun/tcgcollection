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
  // TCGdex card search
  // ------------------------
  document.addEventListener("DOMContentLoaded", () => {
  const tcgForm = document.getElementById("tcgIdForm");
  const tcgQueryInput = document.getElementById("tcgIdQuery");
  const cardResultDiv = document.getElementById("cardResult");

  tcgForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = tcgQueryInput.value.trim();
    if (!query) return;

    // Clear previous results
    cardResultDiv.innerHTML = `<p>Loading...</p>`;

    try {
      // Fetch card data from TCGdex API (replace URL with your actual endpoint)
      const res = await fetch(`https://api.tcgdex.com/cards?name=${encodeURIComponent(query)}`);
      const data = await res.json();

      // Clear loading text
      cardResultDiv.innerHTML = "";

      if (!data || data.length === 0) {
        cardResultDiv.innerHTML = `<p>No cards found for "${query}".</p>`;
        return;
      }

      // Create card elements
      data.forEach(card => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card";
        cardDiv.innerHTML = `
          <img src="${card.imageUrl}" alt="${card.name}" />
          <div class="card-info">${card.name}</div>
        `;
        cardResultDiv.appendChild(cardDiv);
      });

    } catch (err) {
      console.error(err);
      cardResultDiv.innerHTML = `<p>Error fetching cards. Please try again.</p>`;
    }
  });
});