

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
    resultsDiv.innerHTML = "<p>Searching...</p>";

  // Build combined query
    let queryParts = [];
    if (name) queryParts.push(`name:${name}`);
    if (set) queryParts.push(`set.name:${set}`);
    if (rarity) queryParts.push(`rarity:${rarity}`);
    if (type) queryParts.push(`types:${type}`);

    if (queryParts.length === 0) {
      resultsDiv.innerHTML = "<p>Please enter at least one search parameter!</p>";
      return;
    }

    const queryStr = queryParts.join(" ");
    const url = `${API_BASE}/cards?q=${encodeURIComponent(queryStr)}`;

    console.log("API Query URL:", url);

    try {
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
      
      console.log(`Parsed results (${results.length} cards):`, results);

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
          const tcgplayerPriceUnlimited = c.tcgplayer?.prices?.unlimited?.market;
          const tcgplayerPriceUnlimitedHolofoil = c.tcgplayer?.prices?.unlimitedHolofoil?.market;
          const tcgplayerPrice1stEdition = c.tcgplayer?.prices?.["1stEdition"]?.market;
          const tcgplayerPrice1stEdNormal = c.tcgplayer?.prices?.['1stEditionNormal']?.market;
          const tcgplayerPrice1stEdHolofoil = c.tcgplayer?.prices?.["1stEditionHolofoil"]?.market;
         

          const tcgplayerLastUpdated = c.tcgplayer?.updatedAt || "None";

          const printNormalPrice = (tcgplayerPriceNorm != null && tcgplayerPriceNorm !== 0)
               ? `<p><strong>Normal:</strong> $${tcgplayerPriceNorm}</p>` : ``;
          const printHolofoilPrice = (tcgplayerPriceHolofoil != null && tcgplayerPriceHolofoil !== 0)
               ? `<p><strong>Holofoil:</strong> $${tcgplayerPriceHolofoil}</p>` : ``;
          const printreverseHolofoilPrice = (tcgplayerPriceReverseHolofoil != null && tcgplayerPriceReverseHolofoil !== 0)
               ? `<p><strong>Reverse Holofoil:</strong> $${tcgplayerPriceReverseHolofoil}</p>` : ``;
          const printUnlimitedPrice = (tcgplayerPriceUnlimited != null && tcgplayerPriceUnlimited !== 0)
               ? `<p><strong>Unlimited:</strong> $${tcgplayerPriceUnlimited}</p>` : ``;
          const printUnlimitedHolofoilPrice = (tcgplayerPriceUnlimitedHolofoil != null && tcgplayerPriceUnlimitedHolofoil !== 0)
               ? `<p><strong>Unlimited Holofoil:</strong> $${tcgplayerPriceUnlimitedHolofoil}</p>` : ``;
          const print1stEdNormalPrice = (tcgplayerPrice1stEdNormal != null && tcgplayerPrice1stEdNormal !== 0)
               ? `<p><strong>1st Edition normal:</strong> $${tcgplayerPrice1stEdNormal}</p>` : ``;
          const print1stEdHolofoilPrice = (tcgplayerPrice1stEdHolofoil != null && tcgplayerPrice1stEdHolofoil !== 0)
               ? `<p><strong>1st Edition Holofoil:</strong> $${tcgplayerPrice1stEdHolofoil}</p>` : ``;
          const print1stEditionPrice = (tcgplayerPrice1stEdition != null && tcgplayerPrice1stEdition !== 0)
               ? `<p><strong>1st Edition:</strong> $${tcgplayerPrice1stEdition}</p>` : ``;

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
              ${printreverseHolofoilPrice}
              ${printUnlimitedPrice}
              ${printUnlimitedHolofoilPrice}
              ${print1stEditionPrice}
              ${print1stEdNormalPrice}
              ${print1stEdHolofoilPrice}
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
