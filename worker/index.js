// index.js

// DOM elements
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorDiv = document.getElementById("error");

const API_BASE = "https://cf-pages-worker-d1-app.thomasklai88.workers.dev";

// Redirect to search page if already logged in
if (localStorage.getItem("token")) {
  window.location.href = "search.html";
}

// Login form submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    errorDiv.textContent = "Please enter username and password.";
    return;
  }

  errorDiv.textContent = "Logging in...";

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) throw new Error("Login failed. Check your credentials.");

    const data = await res.json();

    if (!data.token) throw new Error("No token returned from server.");

    // Store token
    localStorage.setItem("token", data.token);

    // Redirect to search page
    window.location.href = "search.html";

  } catch (err) {
    errorDiv.textContent = `Error: ${err.message}`;
  }
});

// Optional logout function
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}
