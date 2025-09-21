

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
        method: "GET",
        mode: "cors", // 🔹 ensure cross-origin requests work
        headers: {
           "X-Api-Key": "3c0afac9-db62-4f43-8d3b-d55a0a04b01b",
            "Accept": "application/json"
      }
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
          const tcgplayerPriceNorm = c.tcgplayer?.prices?.normal?.market;
          const tcgplayerPriceHolofoil = c.tcgplayer?.prices?.holofoil?.market;
          const tcgplayerPriceReverseHolofoil = c.tcgplayer?.prices?.reverseHolofoil?.market;
          const tcgplayerPrice1stEdNormal = c.tcgplayer?.prices?.["1stEditionNormal"]?.market;
          const tcgplayerPrice1stEdHolofoil = c.tcgplayer?.prices?.["1stEditionHolofoil"]?.market;

          const tcgplayerLastUpdated = c.tcgplayer?.updatedAt || "None";

          const printNormalPrice = (tcgplayerPriceNorm != null && tcgplayerPriceNorm !== 0)
               ? `<p><strong>Normal:</strong> $${tcgplayerPriceNorm}</p>` : ``;
          const printHolofoilPrice = (tcgplayerPriceHolofoil != null && tcgplayerPriceHolofoil !== 0)
               ? `<p><strong>Holofoil:</strong> $${tcgplayerPriceHolofoil}</p>` : ``;
          const printreverseHolofoilPrice = (tcgplayerPriceReverseHolofoil != null && tcgplayerPriceReverseHolofoil !== 0)
               ? `<p><strong>Reverse Holofoil:</strong> $${tcgplayerPriceReverseHolofoil}</p>` : ``;
          const print1stEdNormalPrice = (tcgplayerPrice1stEdNormal != null && tcgplayerPrice1stEdNormal !== 0)
               ? `<p><strong>Normal:</strong> $${tcgplayerPrice1stEdNormal}</p>` : ``;
          const print1stEdHolofoilPrice = (tcgplayerPrice1stEdHolofoil != null && tcgplayerPrice1stEdHolofoil !== 0)
               ? `<p><strong>Normal:</strong> $${tcgplayerPrice1stEdHolofoil}</p>` : ``;

          return `
            <div class="card" data-card='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
              <img src="${imgUrl}" alt="${c.name || "Unknown"}" 
                   onerror="this.onerror=null; this.src='images/Ditto404_2.png';" />
              <h3>${c.name || "Unknown Name"}</h3>
              <p><strong>Set:</strong> ${c.set?.name || "Unknown"}</p>
              <p><strong>Rarity:</strong> ${c.rarity || "N/A"}</p>
              <p><strong>#:</strong> ${c.number || "N/A"} / ${c.set.total}</p>
              ${printNormalPrice}
              ${printHolofoilPrice}
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

  // 🔹 Fill side panel with clicked card data
  function showCardDetail(c) {
    const imgUrl = c.images?.large || c.images?.small || "images/Ditto404.png";
    const tcgplayerPriceNorm =
      c.tcgplayer?.prices?.normal?.market ||
      c.tcgplayer?.prices?.unlimited?.market ||
      "None";
    const tcgplayerLastUpdated = c.tcgplayer?.updatedAt || "None";

    detailContent.innerHTML = `
      <img src="${imgUrl}" alt="${c.name}" style="width:100%;" />
      <h2>${c.name}</h2>
      <p><strong>Set:</strong> ${c.set?.name || "Unknown"}</p>
      <p><strong>Rarity:</strong> ${c.rarity || "N/A"}</p>
      <p><strong>#:</strong> ${c.number} / ${c.set.total}</p>
      <p><strong>TCGPlayer Price:</strong> ${tcgplayerPriceNorm}</p>
      <p><strong>Last Updated:</strong> ${tcgplayerLastUpdated}</p>
    `;

    detailPanel.classList.remove("hidden");
    setTimeout(() => detailPanel.classList.add("active"), 10);
  }
});
