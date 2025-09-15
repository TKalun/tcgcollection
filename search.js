

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

  // Close side panel
  closePanel.addEventListener("click", () => {
    detailPanel.classList.remove("active");
    setTimeout(() => detailPanel.classList.add("hidden"), 300);
  });

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
            <div class="card" data-card='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
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

      // 🔹 Add click events to open side panel
      document.querySelectorAll(".card").forEach(cardEl => {
        cardEl.addEventListener("click", () => {
          const card = JSON.parse(cardEl.dataset.card.replace(/&apos;/g, "'"));
          showCardDetail(card);
        });
      });

    } catch (err) {
      resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  });

  // ------------------------
  // Open Side Panel
  // ------------------------
  function openSidePanel(card) {
    panelContent.innerHTML = `
      <h2>${card.name}</h2>
      <img src="${card.images.large || card.images.small}" alt="${card.name}" style="max-width:100%;">
      <p><strong>Set:</strong> ${card.set?.name || "Unknown"}</p>
      <p><strong>Rarity:</strong> ${card.rarity || "N/A"}</p>
      <p><strong>Artist:</strong> ${card.artist || "Unknown"}</p>
      <p><strong>HP:</strong> ${card.hp || "N/A"}</p>
      <p><strong>Types:</strong> ${(card.types || []).join(", ") || "N/A"}</p>
    `;

    sidePanel.classList.remove("hidden");
    sidePanel.classList.add("active");
  }
});
