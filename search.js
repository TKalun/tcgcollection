// ------------------------
// Import TCGdex SDK
// ------------------------
/*import TCGdex, { Query } from 'https://unpkg.com/@tcgdex/sdk?module';
const tcgdex = new TCGdex("en");

console.log("TCGdex SDK loaded:", tcgdex);
*/

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

document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("tcgIdForm");
  const fieldSelect = document.getElementById("fieldSelect");
  const cardQueryInput = document.getElementById("tcgIdQuery");
  const resultsDiv = document.getElementById("cardResult");

  const detailPanel = document.getElementById("cardDetail");
  const detailContent = document.getElementById("cardDetailContent");
  const closePanel = document.getElementById("closePanel");

  const API_BASE = "https://api.pokemontcg.io/v2";
  const API_KEY = "3c0afac9-db62-4f43-8d3b-d55a0a04b01b";

  

  searchForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cardQueryInput || !resultsDiv) return;

    const queryVal = cardQueryInput.value.trim();
    const field = fieldSelect?.value || "name";
    resultsDiv.innerHTML = "<p>Searching...</p>";

    try {
      const url = `${API_BASE}/cards?q=${encodeURIComponent(field + ":" + queryVal)}`;
      const res = await fetch(url, {
        headers: { "X-Api-Key": API_KEY }
      });

      if (!res.ok) throw new Error(`API Error ${res.status}: ${res.statusText}`);

      const json = await res.json();
      const results = json.data || [];

      if (results.length === 0) {
        resultsDiv.innerHTML = `<p>No cards found for "${queryVal}" in ${field}</p>`;
        return;
      }

      // 🔹 Keep your gallery intact
      resultsDiv.innerHTML = results
        .map(c => {
          const imgUrl = c.images?.large || c.images?.small || "images/Ditto404.png";
          const tcgplayerPriceNorm =
            c.tcgplayer?.prices?.normal?.market ||
            c.tcgplayer?.prices?.unlimited?.market ||
            "None";
          const tcgplayerLastUpdated = c.tcgplayer?.updatedAt || "None";

          return `
            <div class="card" 
              data-id="${c.id}" 
              data-card='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
            <img src="${imgUrl}" alt="${c.name || "Unknown"}" 
              onerror="this.onerror=null; this.src='images/Ditto404_2.png';" />
            <h3>${c.name || "Unknown Name"}</h3>
            <p><strong>ID:</strong> ${c.id || c.number || "N/A"}</p>
            <p><strong>Set:</strong> ${c.set?.name || "Unknown"}</p>
            <p><strong>Rarity:</strong> ${c.rarity || "N/A"}</p>
            <p><strong>TCGPlayer Price - Normal:</strong> ${tcgplayerPriceNorm}</p>
            <p><strong>Last updated:</strong> ${tcgplayerLastUpdated}</p>
            </div>
          `;
        })
        .join("");

        const sidePanel = document.getElementById("sidePanel");
        const panelContent = document.getElementById("panelContent");
        const closePanel = document.getElementById("closePanel");
        // Close side panel
        closePanel.addEventListener("click", () => {
        sidePanel.classList.remove("open");
        });

       // Attach click listeners to open side panel
      resultsDiv.querySelectorAll(".card").forEach((cardEl) => {
        cardEl.addEventListener("click", () => {
          const cardId = cardEl.dataset.id;
          openSidePanel(cardId);
        });
      });
    } catch (err) {
      console.error("Error fetching cards:", err);
      resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  });

 // ------------------------
  // SIDE PANEL LOGIC
  // ------------------------
  function openSidePanel(cardId, cardEl) {
  const sidePanel = document.getElementById("sidePanel");
  const panelContent = document.getElementById("panelContent");

  // Try to get card data from dataset
  const cardData = cardEl.dataset.card
    ? JSON.parse(cardEl.dataset.card.replace(/&apos;/g, "'"))
    : null;

  if (cardData) {
    showPanelContent(cardData);
    return;
  }

  // fallback: fetch from API if no cached data
  fetch(`${API_BASE}/cards/${cardId}`, {
    headers: { "X-Api-Key": API_KEY }
  })
    .then(res => res.json())
    .then(data => showPanelContent(data.data))
    .catch(err => {
      panelContent.innerHTML = `<p style="color:red;">Error loading card</p>`;
      console.error(err);
    });
}

function showPanelContent(card) {
  const panelContent = document.getElementById("panelContent");
  const sidePanel = document.getElementById("sidePanel");

  panelContent.innerHTML = `
    <h2>${card.name}</h2>
    <img src="${card.images.large || card.images.small}" alt="${card.name}" style="max-width:100%;">
    <p><strong>Set:</strong> ${card.set?.name || "Unknown"}</p>
    <p><strong>Rarity:</strong> ${card.rarity || "N/A"}</p>
    <p><strong>Artist:</strong> ${card.artist || "Unknown"}</p>
    <p><strong>HP:</strong> ${card.hp || "N/A"}</p>
    <p><strong>Types:</strong> ${(card.types || []).join(", ") || "N/A"}</p>
  `;

  sidePanel.classList.add("open");
}


  document.getElementById("closePanel")?.addEventListener("click", () => {
    document.getElementById("sidePanel").classList.remove("open");
  });
});
