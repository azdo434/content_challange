const BLOB = "https://jsonblob.com/api/jsonBlob";
const ID_RE = /^[a-zA-Z0-9_-]{6,80}$/;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 200000) {
        reject(new Error("too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function boardId(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url, `https://${host}`);
  return url.searchParams.get("b") || "";
}

async function createBlob(state) {
  const res = await fetch(BLOB, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("create " + res.status);
  const loc = res.headers.get("location") || res.headers.get("Location") || "";
  const headerId = res.headers.get("x-jsonblob") || "";
  const id = headerId || loc.split("/").filter(Boolean).pop();
  if (!id) throw new Error("no blob id");
  return id;
}

async function getBlob(id) {
  const res = await fetch(`${BLOB}/${id}`, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("get " + res.status);
  return res.json();
}

async function putBlob(id, state) {
  const res = await fetch(`${BLOB}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("put " + res.status);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === "POST") {
      const state = await readBody(req);
      const id = await createBlob(state);
      return send(res, 201, { id, state });
    }

    const id = boardId(req);
    if (!ID_RE.test(id)) return send(res, 400, { error: "bad_id" });

    if (req.method === "GET") {
      const state = await getBlob(id);
      if (!state) return send(res, 404, { error: "not_found" });
      return send(res, 200, { id, state });
    }

    if (req.method === "PUT") {
      const state = await readBody(req);
      await putBlob(id, state);
      return send(res, 200, { id, state });
    }

    return send(res, 405, { error: "method" });
  } catch (err) {
    return send(res, 502, { error: "store_failed", message: String(err.message || err) });
  }
}
