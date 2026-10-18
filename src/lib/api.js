// Thin fetch wrappers matching the ClariFi backend response shapes.

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "clarifi.access_token";

// ============================================================
// TOKEN STORAGE
// ============================================================
// Held in localStorage so a refresh keeps the session. Every request
// below attaches it automatically, so callers never handle it directly.

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // private browsing / storage disabled
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* non-fatal: the session just won't survive a refresh */
  }
}

export function clearToken() {
  setToken(null);
}

// Lets the auth provider react to a token that the server rejected
// (expired, or signed with a different secret after a restart).
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}


async function request(path, options = {}) {
  let res;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Unable to reach the ClariFi backend at ${API_URL}. Make sure the backend is running, or set VITE_API_URL to the deployed backend URL.`
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.detail
        ? typeof payload.detail === "string"
          ? payload.detail
          : JSON.stringify(payload.detail)
        : "";
    } catch {
      detail = await res.text().catch(() => "");
    }

    if (res.status === 401) {
      clearToken();
      onUnauthorized?.();
      const err = new Error(detail || "Your session has expired. Please log in again.");
      err.status = 401;
      throw err;
    }

    const err = new Error(
      `ClariFi API ${path} failed (${res.status})${detail ? `: ${detail}` : ""}`
    );
    err.status = res.status;
    throw err;
  }

  return res.json();
}


// ============================================================
// AUTH
// ============================================================

export async function signup({ name, email, password }) {
  const data = await request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  setToken(data.access_token);
  return data.user;
}

export async function login({ email, password }) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data.user;
}

export function fetchCurrentUser() {
  return request("/api/auth/me");
}

export function logout() {
  clearToken();
}


// ============================================================
// ASK / ORCHESTRATOR
// ============================================================

export function askClarifi(
  message,
  { documentId, conversationId, webSearch } = {}
) {
  return request("/api/ask", {
    method: "POST",
    body: JSON.stringify({
      message,
      document_id: documentId,
      conversation_id: conversationId,
      web_search: webSearch,
    }),
  });
}


// ============================================================
// PRODUCT EXPLAINER
// ============================================================

export function askProductExplainer(
  message,
  { documentId, action = "ask" } = {}
) {
  return request("/api/product-explainer/ask", {
    method: "POST",
    body: JSON.stringify({
      message,
      document_id: documentId,
      action,
    }),
  });
}


// ============================================================
// RISK SIMULATOR
// ============================================================

// Calculate risk using the user's actual asset allocation.
export function calculateRiskScore(assetMix) {
  return request("/api/risk/score", {
    method: "POST",
    body: JSON.stringify({
      asset_mix: assetMix,
    }),
  });
}


// Get historical stress-test scenarios.
export function getStressTestScenarios() {
  return request("/api/risk/scenarios");
}


// Run stress test using the user's actual portfolio.
export function runStressTest(
  scenarioId,
  portfolioValue,
  assetMix
) {
  return request("/api/risk/stress-test", {
    method: "POST",
    body: JSON.stringify({
      scenario_id: scenarioId,
      portfolio_value: portfolioValue,
      asset_mix: assetMix,
    }),
  });
}


// Run 1,000-path stochastic Monte Carlo simulation with Geometric Brownian Motion.
export function runMonteCarlo({
  startingValue,
  assetMix,
  horizonYears = 10,
  monthlySip = 10000,
  targetGoal = 2500000,
  numSimulations = 1000,
}) {
  return request("/api/risk/monte-carlo", {
    method: "POST",
    body: JSON.stringify({
      starting_value: startingValue,
      asset_mix: assetMix,
      horizon_years: horizonYears,
      monthly_sip: monthlySip,
      target_goal: targetGoal,
      num_simulations: numSimulations,
    }),
  });
}


// ============================================================
// SCAM DETECTION
// ============================================================

export function analyzeScamMessage(message) {
  return request("/api/scam/analyze", {
    method: "POST",
    body: JSON.stringify({
      message,
    }),
  });
}


// ============================================================
// PORTFOLIO
// ============================================================

export function getPortfolio() {
  return request("/api/portfolio");
}

export function savePortfolio(payload) {
  return request("/api/portfolio", { method: "PUT", body: JSON.stringify(payload) });
}


export function generatePortfolioSummary() {
  return request("/api/portfolio/summary", {
    method: "POST",
  });
}


// ============================================================
// DOCUMENTS
// ============================================================

export function listDocuments() {
  return request("/api/documents");
}


export function deleteDocument(documentId) {
  return request(`/api/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
}


export async function uploadDocument(
  file,
  category = "Uploaded"
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("category", category);

  let res;
  try {
    res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: authHeaders(), // no Content-Type: the browser sets the multipart boundary
      body: formData,
    });
  } catch {
    throw new Error(
      `Unable to reach the ClariFi backend at ${API_URL}. Make sure the backend is running, or set VITE_API_URL to the deployed backend URL.`
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.detail
        ? typeof payload.detail === "string"
          ? payload.detail
          : JSON.stringify(payload.detail)
        : "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Upload failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return res.json();
}


// ============================================================
// HISTORY
// ============================================================

export function getHistory() {
  return request("/api/history");
}


// ============================================================
// ML INSIGHTS
// ============================================================

export function predictRisk({ equity, debt, others, horizonYears = 5, numAssets = 8 }) {
  return request("/api/ml/risk-predict", {
    method: "POST",
    body: JSON.stringify({
      equity,
      debt,
      others,
      horizon_years: horizonYears,
      num_assets: numAssets,
    }),
  });
}

export function rebalancePortfolio({ equity, debt, others, targetLabel = "Low Risk", horizonYears = 5, numAssets = 8 }) {
  return request("/api/ml/rebalance", {
    method: "POST",
    body: JSON.stringify({
      equity,
      debt,
      others,
      target_label: targetLabel,
      horizon_years: horizonYears,
      num_assets: numAssets,
    }),
  });
}

export function runRLSimulation({
  startingValue = 500000,
  equity = 60,
  debt = 30,
  others = 10,
  horizonYears = 10,
  monthlySip = 10000,
  riskTolerance = "Balanced",
}) {
  return request("/api/ml/rl/simulate", {
    method: "POST",
    body: JSON.stringify({
      starting_value: startingValue,
      equity,
      debt,
      others,
      horizon_years: horizonYears,
      monthly_sip: monthlySip,
      risk_tolerance: riskTolerance,
    }),
  });
}

export function getRLInfo() {
  return request("/api/ml/rl/info");
}


// ============================================================
// IMAGE ANALYSIS
// ============================================================

export async function analyzeImage(file, question = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("question", question);

  let res;
  try {
    res = await fetch(`${API_URL}/api/image/analyze`, {
      method: "POST",
      headers: authHeaders(), // no Content-Type: the browser sets the multipart boundary
      body: formData,
    });
  } catch {
    throw new Error(
      `Unable to reach the ClariFi backend at ${API_URL}. Make sure the backend is running, or set VITE_API_URL to the deployed backend URL.`
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const payload = await res.json();
      detail = payload?.detail
        ? typeof payload.detail === "string"
          ? payload.detail
          : JSON.stringify(payload.detail)
        : "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Image analysis failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return res.json();
}