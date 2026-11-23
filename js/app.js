const DAYS = 30;
const PEOPLE = ["viceo", "clipco"];
const LS_KEY = "gta6-30day-state-v1";
const LS_BOARD = "gta6-30day-board-id";

function emptyPerson() {
  return Array.from({ length: DAYS }, () => ({ done: false, clips: 0 }));
}

function emptyState() {
  return { viceo: emptyPerson(), clipco: emptyPerson(), updatedAt: 0 };
}

function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  for (const who of PEOPLE) {
    const src = Array.isArray(raw[who]) ? raw[who] : [];
    base[who] = base[who].map((slot, i) => {
      const row = src[i] || {};
      const clips = Math.max(0, Math.min(99, Number(row.clips) || 0));
      const done = Boolean(row.done);
      return { done, clips: done ? Math.max(1, clips) : clips };
    });
  }
  base.updatedAt = Number(raw.updatedAt) || 0;
  return base;
}

function loadLocal() {
  try {
    return normalize(JSON.parse(localStorage.getItem(LS_KEY) || "null"));
  } catch {
    return emptyState();
  }
}

function saveLocal(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function boardFromUrl() {
  return new URLSearchParams(location.search).get("b") || localStorage.getItem(LS_BOARD) || "";
}

function setBoardInUrl(id) {
  const url = new URL(location.href);
  url.searchParams.set("b", id);
  history.replaceState(null, "", url);
  localStorage.setItem(LS_BOARD, id);
}

let state = loadLocal();
let boardId = boardFromUrl();
let mode = "local";
let pushTimer = 0;
let pulling = false;

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  const el = $(".toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

function totals(who) {
  const rows = state[who];
  const days = rows.filter((r) => r.done).length;
  const clips = rows.reduce((n, r) => n + (r.done ? r.clips : 0), 0);
  return { days, clips };
}

function renderStats() {
  const a = totals("viceo");
  const b = totals("clipco");
  $("#st-viceo-days").textContent = `${a.days}/30`;
  $("#st-viceo-clips").textContent = String(a.clips);
  $("#st-clipco-days").textContent = `${b.days}/30`;
  $("#st-clipco-clips").textContent = String(b.clips);
  $("#st-total").textContent = String(a.clips + b.clips);
}

function dayButton(who, day) {
  const i = day - 1;
  const row = state[who][i];
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "day" + (row.done ? " is-done" : "");
  btn.dataset.who = who;
  btn.dataset.day = String(day);
  btn.setAttribute("aria-pressed", row.done ? "true" : "false");
  btn.innerHTML = `
    <span class="day-label">DAY ${day}</span>
    <input class="clips" type="number" min="0" max="99" value="${row.clips}" aria-label="Clips day ${day}">
    <span class="box">${row.done && row.clips > 1 ? `<b class="n">${row.clips}</b>` : ""}</span>
  `;
  const input = btn.querySelector(".clips");
  btn.addEventListener("click", (e) => {
    if (e.target === input) return;
    toggleDay(who, i);
  });
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("change", () => {
    const n = Math.max(0, Math.min(99, Number(input.value) || 0));
    setClips(who, i, n);
  });
  return btn;
}

function renderBoards() {
  for (const who of PEOPLE) {
    const root = document.querySelector(`[data-board="${who}"]`);
    root.innerHTML = "";
    for (let col = 0; col < 3; col++) {
      const column = document.createElement("div");
      column.className = "day-col";
      for (let row = 0; row < 10; row++) {
        column.appendChild(dayButton(who, col * 10 + row + 1));
      }
      root.appendChild(column);
    }
  }
  renderStats();
}

function commit() {
  state.updatedAt = Date.now();
  saveLocal(state);
  renderBoards();
  schedulePush();
}

function toggleDay(who, i) {
  const row = state[who][i];
  row.done = !row.done;
  if (row.done && row.clips < 1) row.clips = 1;
  commit();
}

function setClips(who, i, n) {
  state[who][i].clips = n;
  if (n > 0) state[who][i].done = true;
  if (n === 0) state[who][i].done = false;
  commit();
}

function setMode(next) {
  mode = next;
  const pill = $("#mode-pill");
  pill.textContent = next === "live" ? "LIVE" : "LOCAL";
  pill.className = "pill " + next;
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = new Error("api " + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function schedulePush() {
  if (mode !== "live" || !boardId) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 350);
}

async function push() {
  if (mode !== "live" || !boardId) return;
  try {
    await api("/api/state?b=" + encodeURIComponent(boardId), {
      method: "PUT",
      body: JSON.stringify(state),
    });
  } catch {
    setMode("local");
  }
}

async function pull() {
  if (!boardId || pulling) return;
  pulling = true;
  try {
    const data = await api("/api/state?b=" + encodeURIComponent(boardId));
    const remote = normalize(data.state || data);
    if (remote.updatedAt >= state.updatedAt) {
      state = remote;
      saveLocal(state);
      renderBoards();
    }
    setMode("live");
  } catch (e) {
    if (e.status === 404) setMode("local");
  } finally {
    pulling = false;
  }
}

function openShareDialog() {
  const dialog = $("#share-dialog");
  const field = $("#share-url");
  field.value = location.href;
  if (!dialog.open) dialog.showModal();
  field.focus();
  field.select();
}

async function copyShareLink() {
  const value = location.href;
  const field = $("#share-url");
  field.value = value;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    field.focus();
    field.select();
    return document.execCommand("copy");
  }
}

async function createLive() {
  let data;
  try {
    data = await api("/api/state", {
      method: "POST",
      body: JSON.stringify(state),
    });
  } catch {
    toast("COULDN'T CREATE LIVE LINK");
    return;
  }

  boardId = data.id;
  setBoardInUrl(boardId);
  setMode("live");
  openShareDialog();
  const copied = await copyShareLink();
  toast(copied ? "LIVE LINK COPIED" : "LIVE LINK READY");
}

async function share() {
  if (mode !== "live" || !boardId) {
    await createLive();
    return;
  }

  setBoardInUrl(boardId);
  openShareDialog();
  const copied = await copyShareLink();
  toast(copied ? "LIVE LINK COPIED" : "LIVE LINK READY");
}

function resetBoard() {
  state = emptyState();
  boardId = "";
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_BOARD);
  const url = new URL(location.href);
  url.searchParams.delete("b");
  history.replaceState(null, "", url);
  setMode("local");
  renderBoards();
  toast("TRACKER RESET");
}

function boot() {
  const dialog = $("#share-dialog");
  renderBoards();
  $("#share-btn").addEventListener("click", share);
  $("#reset-btn").addEventListener("click", resetBoard);
  $("#copy-share").addEventListener("click", async () => {
    const copied = await copyShareLink();
    toast(copied ? "LIVE LINK COPIED" : "SELECT AND COPY THE LINK");
  });
  $("#share-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  if (boardId) {
    setBoardInUrl(boardId);
    pull();
    setInterval(pull, 2500);
  } else {
    setMode("local");
  }
}

boot();
