const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data.json");
const PUBLIC_DIR = __dirname;

const defaultState = {
  budget: 0,
  masterBudget: 0,
  masterUsed: 0,
  expenses: []
};

function readState() {
  if (!fs.existsSync(DATA_PATH)) return { ...defaultState };
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return {
      budget: Number(parsed.budget) || 0,
      masterBudget: Number(parsed.masterBudget) || 0,
      masterUsed: Number(parsed.masterUsed) || 0,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : []
    };
  } catch {
    return { ...defaultState };
  }
}

function writeState(state) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2), "utf8");
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/state") {
      return sendJson(res, 200, readState());
    }

    if (req.method === "POST" && pathname === "/api/admin/settings") {
      const state = readState();
      const body = await readBody(req);
      if (body.budget !== undefined) state.budget = Math.max(0, Number(body.budget) || 0);
      if (body.masterBudget !== undefined) state.masterBudget = Math.max(0, Number(body.masterBudget) || 0);
      if (body.masterUsed !== undefined) state.masterUsed = Math.max(0, Number(body.masterUsed) || 0);
      writeState(state);
      return sendJson(res, 200, state);
    }

    if (req.method === "POST" && pathname === "/api/expenses") {
      const body = await readBody(req);
      const { date, amount, memo = "", user = "unknown", receiptImage = "" } = body;
      if (!date || Number(amount) <= 0) {
        return sendJson(res, 400, { message: "invalid payload" });
      }
      if (receiptImage && !String(receiptImage).startsWith("data:image/")) {
        return sendJson(res, 400, { message: "invalid receipt image" });
      }
      const state = readState();
      state.expenses.push({
        id: crypto.randomUUID(),
        date,
        amount: Number(amount),
        memo: String(memo || ""),
        user: String(user || "unknown"),
        receiptImage: String(receiptImage || "")
      });
      writeState(state);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/expenses/")) {
      const id = pathname.replace("/api/expenses/", "");
      const state = readState();
      const before = state.expenses.length;
      state.expenses = state.expenses.filter((row) => row.id !== id);
      if (state.expenses.length === before) return sendJson(res, 404, { message: "not found" });
      writeState(state);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "DELETE" && pathname === "/api/state") {
      writeState({ ...defaultState });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/") {
      return sendFile(res, path.join(PUBLIC_DIR, "index.html"));
    }

    if (req.method === "GET") {
      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      return sendFile(res, path.join(PUBLIC_DIR, safePath));
    }

    return sendJson(res, 405, { message: "method not allowed" });
  } catch {
    return sendJson(res, 500, { message: "server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Budget server started: http://localhost:${PORT}`);
});
