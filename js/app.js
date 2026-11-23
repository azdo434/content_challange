import {
  DAYS,
  PEOPLE,
  clampContentCount,
  emptyState,
  markContentCount,
  normalizeState,
  personTotals,
} from "./state.js?v=7";

const LS_KEY = "gta6-30day-state-v1";
const LS_BOARD = "gta6-30day-board-id";

function loadLocal() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(LS_KEY) || "null"));
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
let hasSyncedBoard = false;

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  const el = $(".toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1800);
}

function totals(who) {
  return personTotals(state[who]);
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
  const rowEl = document.createElement("div");
  rowEl.className = "day"
    + (row.done ? " is-done" : "")
    + (row.done && row.clips === 0 ? " is-zero" : "");
  rowEl.dataset.who = who;
  rowEl.dataset.day = String(day);
  const personName = who === "viceo" ? "VICEO" : "vibe_cocos";
  rowEl.innerHTML = `
    <button
      class="day-toggle"
      type="button"
      aria-pressed="${row.done ? "true" : "false"}"
      aria-label="Mark ${personName}, day ${day} ${row.done ? "not completed" : "completed"}"
    >
      <span class="day-label">DAY ${day}</span>
      <span class="box" aria-hidden="true"></span>
    </button>
    <input
      class="clips"
      type="number"
      inputmode="numeric"
      pattern="[0-9]*"
      enterkeyhint="done"
      min="0"
      max="100"
      step="1"
      value="${row.clips}"
      aria-label="Content count for ${personName}, day ${day}"
    >
  `;
  const toggle = rowEl.querySelector(".day-toggle");
  const input = rowEl.querySelector(".clips");
  toggle.addEventListener("click", () => toggleDay(who, i));
  input.addEventListener("focus", () => input.select());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
  input.addEventListener("change", () => {
    const count = clampContentCount(input.value);
    input.value = String(count);
    setClips(who, i, count);
  });
  return rowEl;
}

function renderBoards() {
  for (const who of PEOPLE) {
    const root = document.querySelector(`[data-board="${who}"]`);
    root.innerHTML = "";
    for (let day = 1; day <= DAYS; day++) {
      root.appendChild(dayButton(who, day));
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
  state[who][i].done = !state[who][i].done;
  commit();
}

function setClips(who, i, count) {
  state[who][i] = markContentCount(state[who][i], count);
  commit();
}

function setMode(next) {
  mode = next;
  const pill = $("#mode-pill");
  const stage = $(".stage");
  pill.textContent = next === "live" ? "LIVE" : next === "syncing" ? "SYNC" : "LOCAL";
  pill.className = "pill " + next;
  stage.classList.toggle("is-syncing", next === "syncing");
  stage.setAttribute("aria-busy", next === "syncing" ? "true" : "false");
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
  if (hasSyncedBoard && document.activeElement?.classList.contains("clips")) return;
  pulling = true;
  try {
    const data = await api("/api/state?b=" + encodeURIComponent(boardId));
    const remote = normalizeState(data.state || data);
    if (!hasSyncedBoard || remote.updatedAt > state.updatedAt) {
      state = remote;
      saveLocal(state);
      renderBoards();
    }
    hasSyncedBoard = true;
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
  hasSyncedBoard = true;
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
  hasSyncedBoard = false;
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
    setMode("syncing");
    pull();
    setInterval(pull, 2500);
  } else {
    setMode("local");
  }
}

boot();
