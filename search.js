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
// Local DB search (D1)
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
// TCGdex card ID search (direct asset)
// ------------------------
document.getElementById("tcgIdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cardId = document.getElementById("tcgIdQuery").value.trim();
  const cardDiv = document.getElementById("cardResult");
  cardDiv.innerHTML = "<p>Loading card...</p>";

  try {
    const res = await fetch(`${API_BASE}/api/tcgdex/card/${encodeURIComponent(cardId)}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    if (!data.imgUrl) throw new Error("Invalid card ID or image not found");

    cardDiv.innerHTML = `
      <img class="card-image" src="${data.imgUrl}" alt="${data.cardId}" />
      <p>Card ID: ${data.cardId}</p>
    `;
  } catch (err) {
    cardDiv.innerHTML = `<p style="color:red;">Error fetching card: ${err.message}</p>`;
  }
});

// ------------------------
// Logout button
// ------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "index.html";
});
