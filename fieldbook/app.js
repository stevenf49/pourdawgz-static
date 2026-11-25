// Pourdawgz Field Book — standalone offline app.
// Data lives on the phone (IndexedDB). No customer records ship in these
// files: first open asks for a pack import or an empty book, behind a PIN.
"use strict";

const BUSINESS = "Pourdawgz";
const PHONE = "(605) 515-8327";
const DB_NAME = "pourdawgz-field-book-standalone";
const STORE = "workspace";
const KEY = "main";
const PIN_KEY = "fieldbook-pin-v1";
const LS_FALLBACK_KEY = "fieldbook-workspace-v1";

const JOB_STATUSES = [
  ["scheduled", "Scheduled"],
  ["enroute", "On the way"],
  ["onsite", "On site"],
  ["waiting", "Waiting / parts"],
  ["done", "Done"],
];
const RELY_PAY_LABELS = {
  scheduled: "Not done yet",
  awaiting: "Waiting on Rely pay",
  paid: "Paid",
  missing: "No work order — chase Rely",
};

function uid(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}
function stamp(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
function totalOf(items) {
  return (items || []).reduce((sum, item) => sum + Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.price) || 0), 0);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function jobStatusLabel(status) {
  const found = JOB_STATUSES.find(([key]) => key === status);
  return found ? found[1] : "Scheduled";
}

// ---------- Workspace shape ----------
function blankWorkspace(role) {
  return {
    version: 2,
    role: role === "crew" ? "crew" : "master",
    updatedAt: Date.now(),
    notes: [],
    customers: [],
    crew: [],
    photos: [],
    jobs: [],
    relyOrders: [],
    estimates: [],
    invoices: [],
    priceBook: [],
    messages: [],
    settings: { estimateBaseUrl: "", handsFree: true, voiceURI: "" },
  };
}

function normalizeJob(job) {
  const status = job.status === "done" ? "done" : JOB_STATUSES.some(([key]) => key === job.status) ? job.status : "scheduled";
  return {
    id: String(job.id || uid("job")),
    title: String(job.title || ""),
    customerId: String(job.customerId || ""),
    crewIds: Array.isArray(job.crewIds) ? job.crewIds.map(String) : [],
    jobType: String(job.jobType || ""),
    appointment: String(job.appointment || ""),
    address: String(job.address || ""),
    notes: String(job.notes || ""),
    findings: String(job.findings || ""),
    materials: String(job.materials || ""),
    nextStep: String(job.nextStep || ""),
    photoIds: Array.isArray(job.photoIds) ? job.photoIds.map(String) : [],
    status,
    createdAt: Number(job.createdAt) || Date.now(),
  };
}

function normalizeWorkspace(input, roleOverride) {
  const source = input && typeof input === "object" ? input : {};
  const role = roleOverride === "crew" || roleOverride === "master" ? roleOverride : source.role === "crew" ? "crew" : "master";
  const base = blankWorkspace(role);
  const arr = (value) => (Array.isArray(value) ? value : []);
  const workspace = {
    ...base,
    updatedAt: Number(source.updatedAt) || Date.now(),
    notes: arr(source.notes).map((note) => ({
      id: String(note.id || uid("note")),
      text: String(note.text || ""),
      role: note.role === "maestro" ? "maestro" : "you",
      photoIds: arr(note.photoIds).map(String),
      createdAt: Number(note.createdAt) || Date.now(),
    })),
    customers: arr(source.customers).map((customer) => ({
      id: String(customer.id || uid("customer")),
      name: String(customer.name || ""),
      address: String(customer.address || ""),
      phone: String(customer.phone || ""),
      email: String(customer.email || ""),
      createdAt: Number(customer.createdAt) || Date.now(),
    })),
    crew: arr(source.crew).map((member) => ({
      id: String(member.id || uid("crew")),
      name: String(member.name || ""),
      phone: String(member.phone || ""),
      email: String(member.email || ""),
    })),
    photos: arr(source.photos).map((photo) => ({
      id: String(photo.id || uid("photo")),
      dataUrl: String(photo.dataUrl || ""),
      note: String(photo.note || ""),
      createdAt: Number(photo.createdAt) || Date.now(),
    })),
    jobs: arr(source.jobs).map(normalizeJob),
    relyOrders: arr(source.relyOrders).map((order) => ({
      id: String(order.id || uid("rely")),
      customerName: String(order.customerName || ""),
      address: String(order.address || ""),
      phone: String(order.phone || ""),
      email: String(order.email || ""),
      claim: String(order.claim || ""),
      appointment: String(order.appointment || ""),
      appliance: String(order.appliance || ""),
      issue: String(order.issue || ""),
      serviceFee: String(order.serviceFee || ""),
      authLimit: Number(order.authLimit) || 0,
      diagnosis: String(order.diagnosis || ""),
      diagnosisSent: Boolean(order.diagnosisSent),
      diagnosisSentAt: Number(order.diagnosisSentAt) || undefined,
      payStatus: RELY_PAY_LABELS[order.payStatus] ? order.payStatus : "scheduled",
      missingWorkOrder: Boolean(order.missingWorkOrder),
      createdAt: Number(order.createdAt) || Date.now(),
    })),
    estimates: arr(source.estimates).map((estimate) => ({
      id: String(estimate.id || uid("estimate")),
      number: String(estimate.number || ""),
      customerId: String(estimate.customerId || ""),
      date: String(estimate.date || today()),
      items: arr(estimate.items).map((item) => ({
        id: String(item.id || uid("item")),
        desc: String(item.desc || ""),
        qty: Number(item.qty) || 0,
        price: Number(item.price) || 0,
      })),
      notes: String(estimate.notes || ""),
      privateNotes: String(estimate.privateNotes || ""),
      photoIds: arr(estimate.photoIds).map(String),
      status: estimate.status === "sent" ? "sent" : "draft",
      createdAt: Number(estimate.createdAt) || Date.now(),
    })),
    invoices: arr(source.invoices).map((invoice) => ({
      id: String(invoice.id || uid("invoice")),
      number: String(invoice.number || ""),
      customerId: String(invoice.customerId || ""),
      estimateId: String(invoice.estimateId || ""),
      date: String(invoice.date || today()),
      amount: Number(invoice.amount) || 0,
      status: ["draft", "sent", "paid"].includes(invoice.status) ? invoice.status : "draft",
      notes: String(invoice.notes || ""),
      createdAt: Number(invoice.createdAt) || Date.now(),
    })),
    priceBook: arr(source.priceBook).map((item) => ({
      id: String(item.id || uid("price")),
      name: String(item.name || ""),
      unit: String(item.unit || ""),
      price: Number(item.price) || 0,
      source: String(item.source || ""),
      checked: String(item.checked || ""),
      notes: String(item.notes || ""),
      createdAt: Number(item.createdAt) || Date.now(),
    })),
    messages: arr(source.messages).map((message) => ({
      id: String(message.id || uid("message")),
      customerId: String(message.customerId || ""),
      jobId: String(message.jobId || ""),
      person: String(message.person || ""),
      platform: String(message.platform || ""),
      text: String(message.text || ""),
      createdAt: Number(message.createdAt) || Date.now(),
    })),
    settings: {
      estimateBaseUrl: String(source.settings?.estimateBaseUrl || ""),
      handsFree: source.settings?.handsFree !== false,
      voiceURI: String(source.settings?.voiceURI || ""),
    },
  };
  return role === "crew" ? stripForCrew(workspace) : workspace;
}

// ---------- Crew privacy: no prices ever leave in a crew pack ----------
function redactMoney(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => !/internal split|private note/i.test(line))
    .join("\n")
    .replace(/\$\s?[\d,]+(?:\.\d{1,2})?/g, "[price removed]");
}

function stripForCrew(input) {
  const workspace = clone(input);
  workspace.role = "crew";
  workspace.estimates = [];
  workspace.invoices = [];
  workspace.priceBook = [];
  workspace.notes = [];
  workspace.messages = [];
  workspace.jobs = (workspace.jobs || []).map((job) => ({
    ...job,
    notes: redactMoney(job.notes),
    findings: redactMoney(job.findings),
    materials: redactMoney(job.materials),
    nextStep: redactMoney(job.nextStep),
  }));
  workspace.relyOrders = (workspace.relyOrders || []).map((order) => ({
    ...order,
    serviceFee: "",
    authLimit: 0,
    issue: redactMoney(order.issue),
    diagnosis: redactMoney(order.diagnosis),
  }));
  const jobPhotoIds = new Set();
  workspace.jobs.forEach((job) => (job.photoIds || []).forEach((id) => jobPhotoIds.add(id)));
  workspace.photos = (workspace.photos || [])
    .filter((photo) => jobPhotoIds.has(photo.id))
    .map((photo) => ({ ...photo, note: redactMoney(photo.note) }));
  return workspace;
}

// ---------- Packs ----------
function makePack(workspace, kind) {
  const role = kind === "crew" ? "crew" : "master";
  const book = role === "crew" ? stripForCrew(normalizeWorkspace(workspace, "master")) : normalizeWorkspace(workspace, "master");
  return {
    kind: "fieldbook-pack",
    packVersion: 1,
    role,
    exportedAt: new Date().toISOString(),
    workspace: book,
  };
}

function makeJobPacket(workspace, jobId) {
  const book = normalizeWorkspace(workspace, "master");
  const job = book.jobs.find((item) => item.id === jobId);
  if (!job) return null;
  const subset = blankWorkspace("crew");
  subset.customers = book.customers.filter((customer) => customer.id === job.customerId);
  subset.crew = book.crew;
  subset.jobs = [job];
  subset.photos = book.photos.filter((photo) => job.photoIds.includes(photo.id));
  subset.settings = book.settings;
  return {
    kind: "fieldbook-job-packet",
    packVersion: 1,
    role: "crew",
    exportedAt: new Date().toISOString(),
    workspace: stripForCrew(subset),
  };
}

function parsePack(text) {
  const parsed = JSON.parse(text);
  if (parsed && (parsed.kind === "fieldbook-pack" || parsed.kind === "fieldbook-job-packet")) {
    if (!parsed.workspace || typeof parsed.workspace !== "object") throw new Error("Pack has no book inside it.");
    return {
      kind: parsed.kind,
      role: parsed.role === "crew" ? "crew" : "master",
      workspace: normalizeWorkspace(parsed.workspace, parsed.role === "crew" ? "crew" : "master"),
    };
  }
  if (parsed && (Array.isArray(parsed.customers) || Array.isArray(parsed.jobs) || Array.isArray(parsed.estimates))) {
    return { kind: "fieldbook-pack", role: "master", workspace: normalizeWorkspace(parsed, "master") };
  }
  throw new Error("That file is not a Field Book pack.");
}

function mergeJobPacket(current, packetWorkspace) {
  const next = normalizeWorkspace(current, current.role);
  const incoming = normalizeWorkspace(packetWorkspace, "crew");
  const upsert = (list, items) => {
    const byId = new Map(list.map((item) => [item.id, item]));
    items.forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  };
  next.customers = upsert(next.customers, incoming.customers);
  next.crew = upsert(next.crew, incoming.crew);
  next.jobs = upsert(next.jobs, incoming.jobs);
  next.photos = upsert(next.photos, incoming.photos);
  return next.role === "crew" ? stripForCrew(next) : next;
}

// ---------- Estimate text helpers (client copies never read privateNotes) ----------
function probuildBlock(estimate, customer, total) {
  const lines = estimate.items.filter((item) => item.desc.trim()).map((item, index) => `${index + 1}. ${item.desc.trim()} — ${item.qty} × ${money(item.price)} = ${money(item.qty * item.price)}`);
  const down = Math.round((total / 3) * 100) / 100;
  const last = Math.round((total - down * 2) * 100) / 100;
  return [
    `${BUSINESS} — ${estimate.number}`,
    `Date: ${estimate.date}`,
    `Client: ${customer?.name ?? ""}`,
    ...(customer?.phone ? [`Phone: ${customer.phone}`] : []),
    ...(customer?.address ? [`Address: ${customer.address}`] : []),
    "",
    ...lines,
    "",
    `Total: ${money(total)}`,
    `Payment: ${money(down)} down, ${money(down)} halfway, ${money(last)} on completion`,
    ...(estimate.notes ? ["", `Notes: ${estimate.notes}`] : []),
  ].join("\n");
}

function encodeBase64Url(value) {
  const json = JSON.stringify(value);
  const utf8 = unescape(encodeURIComponent(json));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const utf8 = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return JSON.parse(decodeURIComponent(escape(utf8)));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { blankWorkspace, normalizeWorkspace, stripForCrew, redactMoney, makePack, makeJobPacket, parsePack, mergeJobPacket, totalOf, probuildBlock };
}

// ---------- Offline storage ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage"));
  });
}
async function loadOffline() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not read offline storage"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
async function saveOffline(value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error ?? new Error("Could not save offline data"));
    });
  } catch {
    try { localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(value)); } catch { /* storage full — book stays in memory */ }
  }
}

// ---------- PIN lock ----------
async function hashPin(salt, pin) {
  const text = `${salt}:${pin}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return `fallback-${hash}`;
}
function pinRecord() {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || "null"); } catch { return null; }
}
async function setPin(pin) {
  const salt = uid("salt");
  localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await hashPin(salt, pin) }));
}
async function checkPin(pin) {
  const record = pinRecord();
  if (!record) return false;
  return (await hashPin(record.salt, pin)) === record.hash;
}
function validPin(pin) {
  return /^\d{4,8}$/.test(String(pin || ""));
}

// ---------- App state ----------
let state = null;
let unlocked = false;
const ui = {
  tab: "talk",
  notice: "",
  customerQuery: "",
  selectedJobId: null,
  editingJobId: null,
  selectedRelyId: null,
  editingRelyId: null,
  selectedCustomerId: null,
  editingCustomerId: null,
  estimateDraft: null,
  previewEstimate: false,
  editingInvoiceId: null,
  editingPriceId: null,
  editingCrewId: null,
  editingMessageId: null,
  editingNoteId: null,
  pendingPack: null,
  installPrompt: null,
  showInstallHelp: false,
  readyLink: "",
};
let saveTimer = null;
let recognition = null;
let listening = false;

function isMaster() {
  return state && state.role === "master";
}
function customerById(id) {
  return state.customers.find((customer) => customer.id === id);
}
function photoById(id) {
  return state.photos.find((photo) => photo.id === id);
}
function commit(mutator) {
  mutator(state);
  state.updatedAt = Date.now();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveOffline(state), 250);
  render();
}
function setNotice(text) {
  ui.notice = text;
  render();
}
function emptyEstimateDraft() {
  return {
    id: uid("estimate"),
    number: `ESTIMATE ${state.estimates.length + 24}`,
    customerId: "",
    date: today(),
    items: [{ id: uid("item"), desc: "", qty: 1, price: 0 }],
    notes: "",
    privateNotes: "",
    photoIds: [],
    status: "draft",
    createdAt: Date.now(),
  };
}
function ensureDraft() {
  if (!ui.estimateDraft) ui.estimateDraft = emptyEstimateDraft();
  return ui.estimateDraft;
}
async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Clipboard copy was blocked");
}
function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function resizeFile(file, maxEdge = 1280, quality = 0.76) {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Photo processing is not available");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not resize photo"))), "image/jpeg", quality));
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read photo"));
    reader.readAsDataURL(blob);
  });
}
function speak(text) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    setNotice("Sound is not available in this browser.");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const chosen = voices.find((voice) => voice.voiceURI === state.settings.voiceURI) || voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
  if (chosen) { utterance.voice = chosen; utterance.lang = chosen.lang; }
  utterance.rate = 0.98;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
function startDictation(targetId, saveAsNote) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    setNotice("Talk-to-text is not available in this browser. Type instead.");
    return;
  }
  if (listening && recognition) {
    recognition.stop();
    return;
  }
  const instance = new Ctor();
  instance.continuous = true;
  instance.interimResults = true;
  instance.lang = "en-US";
  instance.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0]?.transcript ?? "";
    }
    if (!finalText.trim()) return;
    if (saveAsNote) {
      commit((current) => { current.notes.unshift({ id: uid("note"), text: finalText.trim(), role: "you", photoIds: [], createdAt: Date.now() }); });
    } else {
      const field = document.getElementById(targetId);
      if (field) field.value = `${field.value}${field.value ? " " : ""}${finalText.trim()}`;
    }
  };
  instance.onerror = () => { listening = false; recognition = null; setNotice("Voice input stopped. Typed notes still work."); };
  instance.onend = () => { listening = false; recognition = null; render(); };
  recognition = instance;
  listening = true;
  instance.start();
  render();
}

// ---------- Render shell ----------
function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const clientPayload = clientPayloadFromHash();
  if (clientPayload) {
    app.innerHTML = clientEstimateHtml(clientPayload);
    return;
  }
  if (!state) {
    app.innerHTML = setupHtml();
    return;
  }
  if (!unlocked) {
    app.innerHTML = lockHtml();
    return;
  }
  const tabs = [["talk", "Talk"], ["jobs", "Jobs"], ["estimates", "Estimates"], ["customers", "Customers"], ["more", "More"]];
  const panels = { talk: talkHtml, jobs: jobsHtml, estimates: estimatesHtml, customers: customersHtml, more: moreHtml };
  app.innerHTML = `
    <div class="app-shell">
      <header class="status-strip">
        <img src="icons/icon-512.png" alt="Pourdawgz logo">
        <span class="book-name">Field Book</span>
        <span class="role-chip">${esc(state.role)} book</span>
        <span class="spacer"></span>
        <span class="offline-tag">${navigator.onLine ? "Saved on this phone" : "Offline — saved here"}</span>
      </header>
      ${ui.notice ? `<div class="notice" role="status"><span>${esc(ui.notice)}</span><button data-action="dismiss-notice" aria-label="Dismiss notice">×</button></div>` : ""}
      ${installBarHtml()}
      <main class="page">${panels[ui.tab]()}</main>
      <nav class="bottom-nav" aria-label="Main sections">
        ${tabs.map(([key, label]) => `<button data-action="tab" data-tab="${key}" class="${ui.tab === key ? "active" : ""}" aria-current="${ui.tab === key ? "page" : "false"}"><span class="nav-mark" aria-hidden="true"></span>${label}</button>`).join("")}
      </nav>
      ${ui.previewEstimate && isMaster() ? estimatePreviewHtml(ensureDraft()) : ""}
      ${ui.showInstallHelp ? installHelpHtml() : ""}
    </div>`;
}

function installBarHtml() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) return "";
  return `<div class="install-bar"><div class="grow"><strong>Home screen</strong><br><span class="help">One tap opens the field book, offline.</span></div><button class="primary" data-action="install">Add to Home Screen</button></div>`;
}
function installHelpHtml() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add to Home Screen"><div class="setup-card"><h2>Add to Home Screen</h2>${ios
    ? `<ol><li>Tap the <strong>Share</strong> button in the browser toolbar.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. Field Book now sits on your home screen like an app.</li></ol>`
    : `<ol><li>Tap your browser menu button.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li><li>Confirm. Field Book now sits on your home screen like an app.</li></ol>`}<button class="primary full" data-action="close-install-help">Got it</button></div></div>`;
}

function setupHtml() {
  return `<div class="setup-wrap"><div class="setup-card">
    <img class="logo" src="icons/icon-512.png" alt="Pourdawgz logo">
    <h1>Field Book</h1>
    <p class="help" style="text-align:center">This phone has no book yet. Import a pack, or start an empty book. Set a PIN first — it locks the book on this phone.</p>
    ${ui.notice ? `<p class="field-error" role="alert">${esc(ui.notice)}</p>` : ""}
    <form data-form="setup">
      <label class="field-label" for="setup-pin">PIN (4–8 digits)</label>
      <input class="pin-input" id="setup-pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password" required>
      <label class="field-label" for="setup-pin2">PIN again</label>
      <input class="pin-input" id="setup-pin2" name="pin2" type="password" inputmode="numeric" autocomplete="new-password" required>
      <label class="field-label" for="setup-pack">Import a pack file</label>
      <input id="setup-pack" type="file" accept="application/json,.json" data-change="setup-pack-file">
      ${ui.pendingPack ? `<p class="help">Pack ready: ${esc(ui.pendingPack.role)} book (${ui.pendingPack.workspace.customers.length} customers, ${ui.pendingPack.workspace.jobs.length} jobs${ui.pendingPack.role === "master" ? `, ${ui.pendingPack.workspace.estimates.length} estimates` : ""}).</p><button class="primary full" type="submit" name="mode" value="import">Import pack &amp; open book</button>` : ""}
      <button class="dark-button full" type="submit" name="mode" value="master">Start empty master book</button>
      <button class="outline full" type="submit" name="mode" value="crew">Start empty crew book</button>
      <p class="help">A master book carries prices and private notes. A crew book never carries prices. Nothing is uploaded — the book lives on this phone.</p>
    </form>
  </div></div>`;
}

function lockHtml() {
  return `<div class="setup-wrap"><div class="setup-card">
    <img class="logo" src="icons/icon-512.png" alt="Pourdawgz logo">
    <h1>Field Book</h1>
    <p class="help" style="text-align:center">Enter the PIN for this phone's book.</p>
    ${ui.notice ? `<p class="field-error" role="alert">${esc(ui.notice)}</p>` : ""}
    <form data-form="unlock">
      <label class="field-label" for="lock-pin">PIN</label>
      <input class="pin-input" id="lock-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required autofocus>
      <button class="primary full" type="submit">Open book</button>
    </form>
  </div></div>`;
}

function clientPayloadFromHash() {
  if (!location.hash.startsWith("#e=")) return null;
  try {
    return decodeBase64Url(location.hash.slice(3));
  } catch {
    return null;
  }
}
function clientEstimateHtml(payload) {
  const lines = (payload.items || []).map((item) => `<div><span>${esc(item.desc)}<small>${esc(item.qty)} × ${money(item.price)}</small></span><strong>${money(item.qty * item.price)}</strong></div>`).join("");
  const photos = (payload.photos || []).map((src) => `<figure><img src="${esc(src)}" alt="Estimate photo"></figure>`).join("");
  return `<main class="page"><div class="estimate-paper">
    <header><div class="estimate-brand"><img src="icons/icon-512.png" alt="Pourdawgz logo"><p>${esc(payload.business || BUSINESS)}</p></div><a href="tel:${esc(String(payload.phone || PHONE).replace(/\D/g, ""))}">${esc(payload.phone || PHONE)}</a></header>
    <div class="estimate-title"><h2>Estimate</h2><strong>${esc(payload.id || "")}</strong></div>
    <dl><div><dt>Prepared for</dt><dd>${esc(payload.client || "Client")}</dd></div><div><dt>Date</dt><dd>${esc(payload.date || "")}</dd></div></dl>
    <div class="preview-lines">${lines}</div>
    <div class="preview-total"><span>Total</span><strong>${money(payload.total)}</strong></div>
    ${payload.notes ? `<p>${esc(payload.notes)}</p>` : ""}
    ${photos ? `<div class="preview-photos">${photos}</div>` : ""}
  </div></main>`;
}

// ---------- Talk ----------
function talkHtml() {
  const notes = state.notes.map((note) => {
    const photos = (note.photoIds || []).map(photoById).filter(Boolean);
    if (ui.editingNoteId === note.id) {
      return `<article class="record-row"><form data-form="note-edit" data-id="${note.id}"><label class="field-label">Edit note</label><textarea name="text" rows="3" required>${esc(note.text)}</textarea><button class="primary" type="submit">Save note</button><button class="text-button" type="button" data-action="cancel-note-edit">Cancel</button></form></article>`;
    }
    return `<article class="record-row"><div class="who"><strong>${note.role === "maestro" ? "Maestro" : "You"}</strong><time>${stamp(note.createdAt)}</time></div>${photos.length ? `<div class="conversation-photos">${photos.map((photo) => `<img src="${esc(photo.dataUrl)}" alt="Photo note">`).join("")}</div>` : ""}<p>${esc(note.text)}</p><div><button class="text-button" data-action="speak-note" data-id="${note.id}">Play</button><button class="text-button" data-action="edit-note" data-id="${note.id}">Edit</button><button class="text-button danger" data-action="delete-note" data-id="${note.id}">Delete</button></div></article>`;
  }).join("");
  return `<section class="stack">
    <div class="section-intro"><h1>Just talk.</h1><p>Dictate a note, type it, or attach a picture. Notes stay on this phone, offline.</p></div>
    <div class="tool-block">
      <button class="${listening ? "dark-button" : "primary"}" data-action="talk-listen">${listening ? "Listening… tap to stop" : "Start dictation"}</button>
      <form data-form="note-add">
        <label class="field-label" for="talk-text">Type instead</label>
        <textarea id="talk-text" name="text" rows="3" placeholder="Job note, measurement, reminder…"></textarea>
        <button class="dark-button" type="submit">Save note</button>
      </form>
      <label class="camera-button" for="talk-photo-input">Take or add picture</label>
      <input class="sr-only" id="talk-photo-input" type="file" accept="image/*" capture="environment" data-change="talk-photo">
    </div>
    <div class="section-rule"><h2>Notes</h2><span>${state.notes.length}</span></div>
    ${state.notes.length ? notes : `<p class="empty">No notes yet. Dictate or type the first one above.</p>`}
  </section>`;
}

// ---------- Jobs (work-order style cards) ----------
function jobAddress(job) {
  return job.address || customerById(job.customerId)?.address || "";
}
function jobCardHtml(job) {
  const customer = customerById(job.customerId);
  const address = jobAddress(job);
  return `<div class="wo-card ${ui.selectedJobId === job.id ? "selected" : ""}">
    <button class="row-main" data-action="open-job" data-id="${job.id}" aria-label="Open job ${esc(job.title)}">
      <span class="wo-top"><span class="wo-customer">${esc(customer?.name || "No customer yet")}</span><span class="chip ${job.status === "done" ? "done" : job.status === "waiting" ? "waiting" : ""}">${jobStatusLabel(job.status)}</span></span>
      <span class="wo-title">${esc(job.title)}</span>
      <span class="wo-meta">
        ${address ? `<span class="addr">${esc(address)}</span>` : ""}
        ${job.jobType ? `<span class="jtype">${esc(job.jobType)}</span>` : ""}
        ${job.appointment ? `<span class="appt">${esc(job.appointment)}</span>` : ""}
        <span>${job.photoIds.length} photo${job.photoIds.length === 1 ? "" : "s"}</span>
      </span>
    </button>
    <div class="wo-actions"><span class="grow"></span><button class="outline" data-action="edit-job" data-id="${job.id}" aria-label="Edit ${esc(job.title)}">Edit</button></div>
  </div>`;
}

function jobDetailHtml(job) {
  const customer = customerById(job.customerId);
  const crewNames = job.crewIds.map((id) => state.crew.find((member) => member.id === id)?.name).filter(Boolean).join(", ");
  const photos = job.photoIds.map(photoById).filter(Boolean);
  const block = (title, text) => text ? `<div class="block"><h4>${title}</h4><p>${esc(text)}</p></div>` : "";
  return `<div class="job-sheet" id="job-detail">
    <div class="sheet-head"><div><p class="meta">${jobStatusLabel(job.status).toUpperCase()}</p><h2>${esc(job.title)}</h2></div><button class="primary" data-action="edit-job" data-id="${job.id}">Edit</button><button class="outline" data-action="close-job">Close</button></div>
    <div class="status-row" aria-label="Update status">${JOB_STATUSES.map(([key, label]) => `<button class="status-btn ${job.status === key ? "active" : ""}" data-action="job-status" data-id="${job.id}" data-status="${key}">${label}</button>`).join("")}</div>
    <div class="detail-grid">
      <div class="detail-cell"><small>Customer</small>${esc(customer?.name || "No customer yet")}</div>
      <div class="detail-cell"><small>Address</small>${esc(jobAddress(job) || "—")}</div>
      <div class="detail-cell"><small>Job type</small>${esc(job.jobType || "—")}</div>
      <div class="detail-cell"><small>Appointment</small>${esc(job.appointment || "—")}</div>
      <div class="detail-cell"><small>Crew</small>${esc(crewNames || "—")}</div>
      <div class="detail-cell"><small>Phone</small>${customer?.phone ? `<a href="tel:${esc(customer.phone.replace(/[^\d+]/g, ""))}">${esc(customer.phone)}</a>` : "—"}</div>
    </div>
    <div class="structured">${block("Findings / work done", job.findings)}${block("Materials / parts", job.materials)}${block("Next step", job.nextStep)}${block("Notes", job.notes)}</div>
    <div class="section-rule"><h3>Photos</h3><span>${photos.length}</span></div>
    ${photos.length ? `<div class="photo-grid">${photos.map((photo) => photoCardHtml(photo, job.id)).join("")}</div>` : `<p class="empty compact">No photos on this job yet.</p>`}
    <label class="camera-button" for="job-photo-${job.id}">Take or add photo</label>
    <input class="sr-only" id="job-photo-${job.id}" type="file" accept="image/*" capture="environment" data-change="job-photo" data-id="${job.id}">
    <button class="outline" data-action="send-job" data-id="${job.id}">Send this job to crew (no prices)</button>
  </div>`;
}

function photoCardHtml(photo, jobId) {
  return `<article class="photo-card"><img src="${esc(photo.dataUrl)}" alt="${esc(photo.note || "Job photo")}"><form data-form="photo-note" data-id="${photo.id}"><textarea id="photo-note-${photo.id}" name="note" rows="2" placeholder="Note for this photo">${esc(photo.note)}</textarea><div class="photo-actions"><button class="outline" type="submit">Save note</button><button class="text-button" type="button" data-action="dictate" data-target="photo-note-${photo.id}">Talk note</button><button class="text-button danger" type="button" data-action="delete-photo" data-id="${photo.id}" data-job="${jobId}">Delete</button></div></form></article>`;
}

function jobEditorHtml(job) {
  const customerOptions = [`<option value="">No customer yet</option>`, ...state.customers.map((customer) => `<option value="${customer.id}" ${job.customerId === customer.id ? "selected" : ""}>${esc(customer.name)}</option>`)].join("");
  return `<form class="job-sheet" data-form="job-edit" data-id="${job.id}" id="job-editor">
    <div class="sheet-head"><h2>Edit job</h2><button class="outline" type="button" data-action="cancel-job-edit">Cancel</button></div>
    <label class="field-label" for="job-title">Job name</label><input id="job-title" name="title" value="${esc(job.title)}" required>
    <label class="field-label" for="job-customer">Customer</label><select id="job-customer" name="customerId">${customerOptions}</select>
    <div class="two-up"><div><label class="field-label" for="job-type">Job type</label><input id="job-type" name="jobType" value="${esc(job.jobType)}" placeholder="Window swap, dryer repair…"></div>
    <div><label class="field-label" for="job-appt">Appointment window</label><input id="job-appt" name="appointment" value="${esc(job.appointment)}" placeholder="Tue Nov 25 · 10 AM–12 PM"></div></div>
    <label class="field-label" for="job-address">Job address (blank = customer address)</label><input id="job-address" name="address" value="${esc(job.address)}">
    <label class="field-label" for="job-status">Status</label><select id="job-status" name="status">${JOB_STATUSES.map(([key, label]) => `<option value="${key}" ${job.status === key ? "selected" : ""}>${label}</option>`).join("")}</select>
    <fieldset><legend>Crew</legend><div class="check-grid">${state.crew.length ? state.crew.map((member) => `<label><input type="checkbox" name="crew" value="${member.id}" ${job.crewIds.includes(member.id) ? "checked" : ""}>${esc(member.name)}${member.phone ? ` <small>${esc(member.phone)}</small>` : ""}</label>`).join("") : `<p class="help">No crew yet — add crew in More.</p>`}</div></fieldset>
    <label class="field-label" for="job-findings">Findings / work done</label><textarea id="job-findings" name="findings" rows="3">${esc(job.findings)}</textarea><button class="outline" type="button" data-action="dictate" data-target="job-findings">Dictate findings</button>
    <label class="field-label" for="job-materials">Materials / parts</label><textarea id="job-materials" name="materials" rows="2">${esc(job.materials)}</textarea>
    <label class="field-label" for="job-next">Next step</label><textarea id="job-next" name="nextStep" rows="2">${esc(job.nextStep)}</textarea>
    <label class="field-label" for="job-notes">Notes</label><textarea id="job-notes" name="notes" rows="3">${esc(job.notes)}</textarea>
    <button class="primary" type="submit">Save job</button>
    <button class="text-button danger" type="button" data-action="delete-job" data-id="${job.id}">Delete job</button>
  </form>`;
}

function relyCardHtml(order) {
  const status = order.diagnosisSent ? "Diagnosis sent" : RELY_PAY_LABELS[order.payStatus];
  return `<div class="wo-card ${ui.selectedRelyId === order.id ? "selected" : ""}">
    <button class="row-main" data-action="open-rely" data-id="${order.id}" aria-label="Open work order for ${esc(order.customerName || "unnamed customer")}">
      <span class="wo-top"><span class="wo-customer">${esc(order.customerName || "Unnamed customer")}</span><span class="chip ${order.missingWorkOrder ? "flag" : ""}">${order.missingWorkOrder ? "No work order" : esc(status)}</span></span>
      <span class="wo-title">${esc(order.appliance || "Appliance not noted")}</span>
      <span class="wo-meta">${order.address ? `<span class="addr">${esc(order.address)}</span>` : ""}${order.appointment ? `<span class="appt">${esc(order.appointment)}</span>` : ""}<span>${order.claim ? `Claim ${esc(order.claim)}` : "No claim"}</span></span>
    </button>
    <div class="wo-actions"><span class="grow"></span><button class="outline" data-action="edit-rely" data-id="${order.id}">Edit</button></div>
  </div>`;
}

function relyDetailHtml(order) {
  return `<div class="job-sheet" id="rely-detail">
    <div class="sheet-head"><div><p class="meta">${order.missingWorkOrder ? "MISSING WORK ORDER" : "RELY WORK ORDER"}</p><h2>${esc(order.customerName || "Unnamed customer")}</h2></div><button class="primary" data-action="edit-rely" data-id="${order.id}">Edit</button><button class="outline" data-action="close-rely">Close</button></div>
    ${order.missingWorkOrder ? `<p class="warn-box">No work order was ever received for this job — no claim number yet.</p>` : ""}
    <div class="detail-grid">
      <div class="detail-cell"><small>Address</small>${esc(order.address || "—")}</div>
      <div class="detail-cell"><small>Appointment</small>${esc(order.appointment || "—")}</div>
      <div class="detail-cell"><small>Appliance</small>${esc(order.appliance || "—")}</div>
      <div class="detail-cell"><small>Claim</small>${esc(order.claim || "—")}</div>
      <div class="detail-cell"><small>Phone</small>${order.phone ? `<a href="tel:${esc(order.phone.replace(/[^\d+]/g, ""))}">${esc(order.phone)}</a>` : "—"}</div>
      <div class="detail-cell"><small>Pay status</small>${esc(RELY_PAY_LABELS[order.payStatus])}</div>
      ${isMaster() ? `<div class="detail-cell"><small>Service fee</small>${esc(order.serviceFee || "—")}</div><div class="detail-cell"><small>Auth limit</small>${money(order.authLimit)}</div>` : ""}
    </div>
    <div class="structured">${order.issue ? `<div class="block"><h4>Issue</h4><p>${esc(order.issue)}</p></div>` : ""}<div class="block"><h4>Diagnosis</h4><p>${esc(order.diagnosis || "Not written yet.")}</p></div></div>
    <p class="help">${order.diagnosisSent ? `Diagnosis marked sent${order.diagnosisSentAt ? ` ${stamp(order.diagnosisSentAt)}` : ""}.` : "Diagnosis not marked sent yet."}</p>
    <div class="status-row">${order.claim ? `<button class="outline" data-action="copy-claim" data-id="${order.id}">Copy claim number</button>` : ""}${order.diagnosisSent ? `<button class="outline" data-action="rely-sent" data-id="${order.id}" data-sent="0">Undo — not sent</button>` : `<button class="primary" data-action="rely-sent" data-id="${order.id}" data-sent="1" ${order.claim ? "" : "disabled"}>Mark diagnosis sent</button>`}</div>
  </div>`;
}

function relyEditorHtml(order) {
  return `<form class="job-sheet" data-form="rely-edit" data-id="${order.id}" id="rely-editor">
    <div class="sheet-head"><h2>Edit work order</h2><button class="outline" type="button" data-action="cancel-rely-edit">Cancel</button></div>
    <label class="field-label" for="rely-name">Customer name</label><input id="rely-name" name="customerName" value="${esc(order.customerName)}">
    <label class="field-label" for="rely-address">Street address</label><input id="rely-address" name="address" value="${esc(order.address)}">
    <div class="two-up"><div><label class="field-label" for="rely-phone">Phone</label><input id="rely-phone" name="phone" type="tel" value="${esc(order.phone)}"></div><div><label class="field-label" for="rely-email">Email</label><input id="rely-email" name="email" type="email" value="${esc(order.email)}"></div></div>
    <div class="two-up"><div><label class="field-label" for="rely-claim">Claim / work-order number</label><input id="rely-claim" name="claim" value="${esc(order.claim)}"></div><div><label class="field-label" for="rely-appt">Appointment</label><input id="rely-appt" name="appointment" value="${esc(order.appointment)}"></div></div>
    <div class="two-up"><div><label class="field-label" for="rely-appliance">Appliance + brand</label><input id="rely-appliance" name="appliance" value="${esc(order.appliance)}"></div>${isMaster() ? `<div><label class="field-label" for="rely-fee">Service call fee</label><input id="rely-fee" name="serviceFee" value="${esc(order.serviceFee)}"></div>` : ""}</div>
    <label class="field-label" for="rely-issue">Issue</label><textarea id="rely-issue" name="issue" rows="2">${esc(order.issue)}</textarea>
    <div class="two-up">${isMaster() ? `<div><label class="field-label" for="rely-auth">Authorization limit ($)</label><input id="rely-auth" name="authLimit" type="number" min="0" step="1" value="${order.authLimit}"></div>` : ""}<div><label class="field-label" for="rely-pay">Pay status</label><select id="rely-pay" name="payStatus">${Object.keys(RELY_PAY_LABELS).map((key) => `<option value="${key}" ${order.payStatus === key ? "selected" : ""}>${RELY_PAY_LABELS[key]}</option>`).join("")}</select></div></div>
    <label class="field-label" for="rely-diagnosis">Diagnosis</label><textarea id="rely-diagnosis" name="diagnosis" rows="4">${esc(order.diagnosis)}</textarea>
    <button class="outline" type="button" data-action="dictate" data-target="rely-diagnosis">Dictate diagnosis</button>
    <button class="primary" type="submit">Save work order</button>
    <button class="text-button danger" type="button" data-action="delete-rely" data-id="${order.id}">Delete work order</button>
  </form>`;
}

function jobsHtml() {
  const job = state.jobs.find((item) => item.id === ui.selectedJobId);
  const editingJob = state.jobs.find((item) => item.id === ui.editingJobId);
  const order = state.relyOrders.find((item) => item.id === ui.selectedRelyId);
  const editingOrder = state.relyOrders.find((item) => item.id === ui.editingRelyId);
  return `<section class="stack">
    <div class="section-intro"><h1>Jobs</h1><p>Work orders first. Tap a card for details, photos, and status.</p></div>
    <div class="section-rule"><h2>Rely Home work orders</h2><span>${state.relyOrders.length}</span></div>
    <form class="tool-block" data-form="rely-add">
      <label class="field-label" for="rely-new-name">New work order</label>
      <input id="rely-new-name" name="customerName" placeholder="Customer name">
      <input name="claim" placeholder="Claim number" aria-label="New work order claim number">
      <input name="appliance" placeholder="Appliance — e.g. Samsung microwave" aria-label="New work order appliance">
      <input name="appointment" placeholder="Appointment — e.g. Mon Nov 16 · 3–8 PM" aria-label="New work order appointment">
      <button class="primary" type="submit">Add work order</button>
    </form>
    ${state.relyOrders.length ? `<div class="wo-list">${state.relyOrders.map(relyCardHtml).join("")}</div>` : `<p class="empty">No Rely work orders yet. Add the next one above when the email lands.</p>`}
    ${editingOrder ? relyEditorHtml(editingOrder) : order ? relyDetailHtml(order) : ""}
    <div class="section-rule"><h2>Job walk</h2><span>${state.jobs.length}</span></div>
    <form class="tool-block" data-form="job-add">
      <label class="field-label" for="job-new-name">New job</label>
      <input id="job-new-name" name="title" placeholder="Shed door, deck leveling…" required>
      <label class="field-label" for="job-new-customer">Customer</label>
      <select id="job-new-customer" name="customerId"><option value="">No customer yet</option>${state.customers.map((customer) => `<option value="${customer.id}">${esc(customer.name)}</option>`).join("")}</select>
      <div class="two-up"><div><label class="field-label" for="job-new-type">Job type</label><input id="job-new-type" name="jobType" placeholder="Window swap, siding…"></div><div><label class="field-label" for="job-new-appt">Appointment window</label><input id="job-new-appt" name="appointment" placeholder="Tue · 10 AM–12 PM"></div></div>
      <button class="primary" type="submit">Start job</button>
    </form>
    ${state.jobs.length ? `<div class="wo-list">${state.jobs.map(jobCardHtml).join("")}</div>` : `<p class="empty">Start a job above. Then add photos and notes while you walk.</p>`}
    ${editingJob ? jobEditorHtml(editingJob) : job ? jobDetailHtml(job) : ""}
  </section>`;
}

// ---------- Estimates & invoices (master book only) ----------
function estimatesHtml() {
  if (!isMaster()) {
    return `<section class="stack"><div class="section-intro"><h1>Estimates</h1><p>Prices live in the master book. Crew books carry jobs only — no prices.</p></div><p class="empty">Nothing priced is stored on this phone.</p></section>`;
  }
  const draft = ensureDraft();
  const total = totalOf(draft.items);
  const editingInvoice = state.invoices.find((invoice) => invoice.id === ui.editingInvoiceId);
  return `<section class="stack">
    <div class="section-intro"><h1>Build estimate</h1><p>Photos show right on the client copy. Private notes never do.</p></div>
    <form data-form="estimate-save">
      <div class="estimate-head"><input name="number" value="${esc(draft.number)}" aria-label="Estimate number" style="max-width:220px"><span>${money(total)}</span></div>
      <div class="two-up"><div><label class="field-label" for="estimate-date">Date</label><input id="estimate-date" name="date" type="date" value="${esc(draft.date)}"></div>
      <div><label class="field-label" for="estimate-client">Customer</label><select id="estimate-client" name="customerId"><option value="">Choose</option>${state.customers.map((customer) => `<option value="${customer.id}" ${draft.customerId === customer.id ? "selected" : ""}>${esc(customer.name)}</option>`).join("")}</select></div></div>
      <div class="section-rule"><h2>Line items</h2><span>${draft.items.length}</span></div>
      ${draft.items.map((item, index) => `<div class="line-item"><strong>${index + 1}</strong><input name="desc-${item.id}" value="${esc(item.desc)}" placeholder="Work or material" aria-label="Line ${index + 1} description"><div class="line-values"><label>Qty<input name="qty-${item.id}" type="number" min="0" step="0.25" value="${item.qty}" aria-label="Line ${index + 1} quantity"></label><label>Unit price<input name="price-${item.id}" type="number" min="0" step="0.01" value="${item.price}" aria-label="Line ${index + 1} unit price"></label><strong>${money(item.qty * item.price)}</strong></div>${draft.items.length > 1 ? `<button class="text-button danger" type="button" data-action="remove-line" data-id="${item.id}">Remove line</button>` : ""}</div>`).join("")}
      <button class="outline full" type="button" data-action="add-line">Add line item</button>
      <label class="field-label" for="estimate-notes">Estimate notes</label><textarea id="estimate-notes" name="notes" rows="4">${esc(draft.notes)}</textarea>
      <label class="field-label" for="estimate-private">Private notes — only in your field book</label><textarea id="estimate-private" name="privateNotes" rows="2" placeholder="Splits and costs — never on a client or crew copy">${esc(draft.privateNotes)}</textarea>
      <fieldset><legend>Photos on estimate</legend><div class="estimate-photo-picker">${state.photos.length ? state.photos.map((photo) => `<label class="${draft.photoIds.includes(photo.id) ? "picked" : ""}"><img src="${esc(photo.dataUrl)}" alt="Job photo"><input type="checkbox" name="photo" value="${photo.id}" ${draft.photoIds.includes(photo.id) ? "checked" : ""}><span>${draft.photoIds.includes(photo.id) ? "On estimate" : "Add"}</span></label>`).join("") : `<p class="empty compact">Take job photos first.</p>`}</div></fieldset>
      <div class="action-stack">
        <button class="primary" type="submit">Save estimate</button>
        <button class="outline" type="button" data-action="preview-estimate">Client preview</button>
        <button class="outline" type="button" data-action="copy-probuild">Copy for ProBuild</button>
        <button class="dark-button" type="button" data-action="copy-client-link">Copy client link</button>
        <button class="outline" type="button" data-action="new-estimate">New estimate</button>
        ${ui.readyLink ? `<label class="field-label">Client link<textarea readonly rows="3" data-action-select>${esc(ui.readyLink)}</textarea></label>` : ""}
      </div>
    </form>
    <div class="section-rule"><h2>Saved estimates</h2><span>${state.estimates.length}</span></div>
    ${state.estimates.length ? state.estimates.map((estimate) => `<div class="row-line"><button class="row-main" data-action="edit-estimate" data-id="${estimate.id}"><strong>${esc(estimate.number)}</strong><small>${esc(customerById(estimate.customerId)?.name || "No customer")} · ${esc(estimate.date)} · ${esc(estimate.status)}</small></button><b>${money(totalOf(estimate.items))}</b><button class="outline" data-action="edit-estimate" data-id="${estimate.id}">Edit</button></div>`).join("") : `<p class="empty">No saved estimates yet.</p>`}
    <div class="section-rule"><h2>Invoices</h2><span>${state.invoices.length}</span></div>
    ${invoiceFormHtml(editingInvoice)}
    ${state.invoices.length ? state.invoices.map((invoice) => `<div class="row-line"><button class="row-main" data-action="edit-invoice" data-id="${invoice.id}"><strong>${esc(invoice.number || "Invoice")}</strong><small>${esc(customerById(invoice.customerId)?.name || "No customer")} · ${esc(invoice.date)} · ${esc(invoice.status)}</small></button><b>${money(invoice.amount)}</b><button class="outline" data-action="edit-invoice" data-id="${invoice.id}">Edit</button></div>`).join("") : `<p class="empty">No invoices yet.</p>`}
  </section>`;
}

function invoiceFormHtml(invoice) {
  const value = invoice || { number: "", customerId: "", estimateId: "", date: today(), amount: 0, status: "draft", notes: "" };
  return `<form class="tool-block" data-form="invoice-save" data-id="${invoice ? invoice.id : ""}">
    <label class="field-label">${invoice ? "Edit invoice" : "Add invoice"}</label>
    <input name="number" value="${esc(value.number)}" placeholder="Invoice number">
    <div class="two-up"><div><label class="field-label">Customer</label><select name="customerId"><option value="">Choose</option>${state.customers.map((customer) => `<option value="${customer.id}" ${value.customerId === customer.id ? "selected" : ""}>${esc(customer.name)}</option>`).join("")}</select></div>
    <div><label class="field-label">Date</label><input name="date" type="date" value="${esc(value.date)}"></div></div>
    <div class="two-up"><div><label class="field-label">Amount ($)</label><input name="amount" type="number" min="0" step="0.01" value="${value.amount}"></div>
    <div><label class="field-label">Status</label><select name="status">${["draft", "sent", "paid"].map((status) => `<option value="${status}" ${value.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></div></div>
    <label class="field-label">Linked estimate</label><select name="estimateId"><option value="">None</option>${state.estimates.map((estimate) => `<option value="${estimate.id}" ${value.estimateId === estimate.id ? "selected" : ""}>${esc(estimate.number)}</option>`).join("")}</select>
    <label class="field-label">Notes</label><textarea name="notes" rows="2">${esc(value.notes)}</textarea>
    <button class="primary" type="submit">${invoice ? "Save invoice" : "Add invoice"}</button>
    ${invoice ? `<button class="text-button" type="button" data-action="cancel-invoice-edit">Cancel edit</button><button class="text-button danger" type="button" data-action="delete-invoice" data-id="${invoice.id}">Delete invoice</button>` : ""}
  </form>`;
}

function estimatePreviewHtml(estimate) {
  const customer = customerById(estimate.customerId);
  const photos = estimate.photoIds.map(photoById).filter(Boolean);
  return `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Client estimate preview"><div class="estimate-paper">
    <button class="outline" data-action="close-preview">Close preview</button>
    <header><div class="estimate-brand"><img src="icons/icon-512.png" alt="Pourdawgz logo"><p>${BUSINESS}</p></div><a href="tel:${PHONE.replace(/\D/g, "")}">${PHONE}</a></header>
    <div class="estimate-title"><h2>Estimate</h2><strong>${esc(estimate.number)}</strong></div>
    <dl><div><dt>Prepared for</dt><dd>${esc(customer?.name || "Client")}</dd></div><div><dt>Date</dt><dd>${esc(estimate.date)}</dd></div>${customer?.address ? `<div><dt>Job address</dt><dd>${esc(customer.address)}</dd></div>` : ""}</dl>
    <div class="preview-lines">${estimate.items.filter((item) => item.desc.trim()).map((item) => `<div><span>${esc(item.desc)}<small>${item.qty} × ${money(item.price)}</small></span><strong>${money(item.qty * item.price)}</strong></div>`).join("")}</div>
    <div class="preview-total"><span>Total</span><strong>${money(totalOf(estimate.items))}</strong></div>
    ${estimate.notes ? `<p>${esc(estimate.notes)}</p>` : ""}
    ${photos.length ? `<div class="preview-photos">${photos.map((photo) => `<figure><img src="${esc(photo.dataUrl)}" alt="Estimate photo">${photo.note ? `<figcaption>${esc(photo.note)}</figcaption>` : ""}</figure>`).join("")}</div>` : ""}
  </div></div>`;
}

function readEstimateForm(form) {
  const draft = ensureDraft();
  const data = new FormData(form);
  draft.number = String(data.get("number") || draft.number);
  draft.date = String(data.get("date") || draft.date);
  draft.customerId = String(data.get("customerId") || "");
  draft.notes = String(data.get("notes") || "");
  draft.privateNotes = String(data.get("privateNotes") || "");
  draft.items = draft.items.map((item) => ({
    ...item,
    desc: String(data.get(`desc-${item.id}`) || ""),
    qty: Number(data.get(`qty-${item.id}`)) || 0,
    price: Number(data.get(`price-${item.id}`)) || 0,
  }));
  draft.photoIds = data.getAll("photo").map(String);
  return draft;
}

// ---------- Customers ----------
function customersHtml() {
  const editing = state.customers.find((customer) => customer.id === ui.editingCustomerId);
  const current = state.customers.find((customer) => customer.id === ui.selectedCustomerId);
  const query = ui.customerQuery.toLowerCase();
  const filtered = state.customers.filter((customer) => `${customer.name} ${customer.address} ${customer.phone} ${customer.email}`.toLowerCase().includes(query));
  return `<section class="stack">
    <div class="section-intro"><h1>Customers</h1><p>Search the whole book anytime.</p></div>
    <form class="tool-block" data-form="customer-save" data-id="${editing ? editing.id : ""}">
      <label class="field-label" for="customer-name">${editing ? "Edit customer" : "Add customer"}</label>
      <input id="customer-name" name="name" value="${esc(editing?.name || "")}" placeholder="Name" required>
      <input name="address" value="${esc(editing?.address || "")}" placeholder="Address" aria-label="Customer address">
      <input name="phone" type="tel" value="${esc(editing?.phone || "")}" placeholder="Phone" aria-label="Customer phone">
      <input name="email" type="email" value="${esc(editing?.email || "")}" placeholder="Email" aria-label="Customer email">
      <button class="primary" type="submit">${editing ? "Save changes" : "Save customer"}</button>
      ${editing ? `<button class="text-button" type="button" data-action="cancel-customer-edit">Cancel edit</button>` : ""}
    </form>
    <label class="field-label" for="customer-search">Search customers</label>
    <input id="customer-search" type="search" value="${esc(ui.customerQuery)}" placeholder="Name, phone, or address" data-input="customer-search">
    ${filtered.length ? filtered.map((customer) => `<div class="row-line"><button class="row-main" data-action="open-customer" data-id="${customer.id}"><strong>${esc(customer.name)}</strong><small>${esc(customer.address || customer.phone || customer.email || "No contact details yet")}</small></button><b>${state.jobs.filter((job) => job.customerId === customer.id).length + (isMaster() ? state.estimates.filter((estimate) => estimate.customerId === customer.id).length : 0)}</b><button class="outline" data-action="edit-customer" data-id="${customer.id}">Edit</button></div>`).join("") : `<p class="empty">No customers match.</p>`}
    ${current ? customerFileHtml(current) : ""}
  </section>`;
}

function customerFileHtml(customer) {
  const jobs = state.jobs.filter((job) => job.customerId === customer.id);
  const estimates = isMaster() ? state.estimates.filter((estimate) => estimate.customerId === customer.id) : [];
  const messages = state.messages.filter((message) => message.customerId === customer.id);
  return `<div class="history-sheet">
    <div class="sheet-head"><div><p class="meta">CUSTOMER FILE</p><h2>${esc(customer.name)}</h2></div><button class="primary" data-action="edit-customer" data-id="${customer.id}">Edit</button><button class="outline" data-action="close-customer">Close</button></div>
    ${customer.phone ? `<a class="contact-link" href="tel:${esc(customer.phone.replace(/[^\d+]/g, ""))}">Call ${esc(customer.phone)}</a><a class="contact-link" href="sms:${esc(customer.phone.replace(/[^\d+]/g, ""))}">Text ${esc(customer.phone)}</a>` : ""}
    ${customer.email ? `<a class="contact-link" href="mailto:${esc(customer.email)}">Email ${esc(customer.email)}</a>` : ""}
    ${customer.address ? `<p>${esc(customer.address)}</p>` : ""}
    <div class="section-rule"><h3>Jobs</h3></div>
    ${jobs.length ? jobs.map((job) => `<p class="history-row"><strong>${esc(job.title)}</strong><span>${jobStatusLabel(job.status)}</span></p>`).join("") : `<p class="empty compact">No jobs yet.</p>`}
    ${isMaster() ? `<div class="section-rule"><h3>Estimates</h3></div>${estimates.length ? estimates.map((estimate) => `<p class="history-row"><strong>${esc(estimate.number)}</strong><span>${money(totalOf(estimate.items))}</span></p>`).join("") : `<p class="empty compact">No estimates yet.</p>`}` : ""}
    <div class="section-rule"><h3>Messages</h3></div>
    ${messages.length ? messages.map((message) => `<p class="history-row"><strong>${esc(message.platform || "Message")}</strong><span>${stamp(message.createdAt)}</span></p><p>${esc(message.text)}</p>`).join("") : `<p class="empty compact">No messages logged yet.</p>`}
  </div>`;
}

// ---------- More: packs, price book, crew, messages, settings ----------
function moreHtml() {
  return `<section class="stack">
    <div class="section-intro"><h1>More</h1><p>Backup packs, ${isMaster() ? "price book, " : ""}crew, messages, and settings.</p></div>
    <div class="section-rule"><h2>Backup &amp; packs</h2></div>
    <div class="tool-block">
      ${isMaster() ? `<button class="primary" data-action="export-master">Export master pack (with prices)</button>` : ""}
      <button class="dark-button" data-action="export-crew">Export crew pack (no prices)</button>
      <label class="field-label" for="import-pack">Import a pack</label>
      <input id="import-pack" type="file" accept="application/json,.json" data-change="import-pack-file">
      <p class="help">Importing a whole-book pack replaces this phone's book. Importing a single-job packet adds that job. Crew packs leave out estimates, invoices, the price book, private notes, notes, and messages — and dollar amounts are stripped from job text.</p>
    </div>
    ${isMaster() ? priceBookHtml() : ""}
    ${crewHtml()}
    ${messagesHtml()}
    <div class="section-rule"><h2>Home screen</h2></div>
    <button class="primary" data-action="install">Add to Home Screen</button>
    ${isMaster() ? `<div class="section-rule"><h2>Client estimate page</h2></div><form class="tool-block" data-form="estimate-url"><label class="field-label" for="estimate-page-url">Client estimate page URL</label><input id="estimate-page-url" name="url" type="url" value="${esc(state.settings.estimateBaseUrl)}" placeholder="Blank uses this Field Book page"><button class="primary" type="submit">Save client page link</button><p class="help">Copy client link adds the estimate details to this page link.</p></form>` : ""}
    <div class="section-rule"><h2>PIN</h2></div>
    <form class="tool-block" data-form="change-pin">
      <label class="field-label" for="pin-current">Current PIN</label><input id="pin-current" name="current" type="password" inputmode="numeric" autocomplete="current-password" required>
      <label class="field-label" for="pin-new">New PIN (4–8 digits)</label><input id="pin-new" name="next" type="password" inputmode="numeric" autocomplete="new-password" required>
      <button class="primary" type="submit">Change PIN</button>
    </form>
    <button class="outline" data-action="lock">Lock book</button>
  </section>`;
}

function priceBookHtml() {
  const editing = state.priceBook.find((item) => item.id === ui.editingPriceId);
  return `<div class="section-rule"><h2>Price Book</h2><span>${state.priceBook.length}</span></div>
  <form class="tool-block" data-form="price-save" data-id="${editing ? editing.id : ""}">
    <label class="field-label">${editing ? "Edit price book item" : "Add price book item"}</label>
    <input name="name" value="${esc(editing?.name || "")}" placeholder="Item or labor" required>
    <div class="two-up"><div><label class="field-label">Price ($)</label><input name="price" type="number" min="0" step="0.01" value="${editing?.price ?? 0}"></div><div><label class="field-label">Unit</label><input name="unit" value="${esc(editing?.unit || "")}" placeholder="per hour, each, per sq ft…"></div></div>
    <div class="two-up"><div><label class="field-label">Source</label><input name="source" value="${esc(editing?.source || "")}" placeholder="Where the price came from"></div><div><label class="field-label">Date checked</label><input name="checked" type="date" value="${esc(editing?.checked || today())}"></div></div>
    <label class="field-label">Notes</label><textarea name="notes" rows="2">${esc(editing?.notes || "")}</textarea>
    <button class="primary" type="submit">${editing ? "Save item" : "Add item"}</button>
    ${editing ? `<button class="text-button" type="button" data-action="cancel-price-edit">Cancel edit</button>` : ""}
  </form>
  ${state.priceBook.length ? state.priceBook.map((item) => `<div class="row-line"><button class="row-main" data-action="edit-price" data-id="${item.id}"><strong>${esc(item.name)}</strong><small>${esc(item.source || "")}${item.checked ? ` · checked ${esc(item.checked)}` : ""}</small></button><b>${money(item.price)}${item.unit ? ` ${esc(item.unit)}` : ""}</b><button class="outline" data-action="edit-price" data-id="${item.id}">Edit</button><button class="text-button danger" data-action="delete-price" data-id="${item.id}">Delete</button></div>`).join("") : `<p class="empty">Price book is empty. Add sourced, dated prices here — never quote from memory.</p>`}`;
}

function crewHtml() {
  const editing = state.crew.find((member) => member.id === ui.editingCrewId);
  return `<div class="section-rule"><h2>Crew</h2><span>${state.crew.length}</span></div>
  ${state.crew.map((member) => `<div class="card"><div class="sheet-head"><strong>${esc(member.name || "Crew member")}</strong><button class="outline" data-action="edit-crew" data-id="${member.id}">Edit</button></div><div class="crew-contact-actions">${member.phone ? `<a class="contact-chip" href="tel:${esc(member.phone.replace(/[^\d+]/g, ""))}">Call</a><a class="contact-chip" href="sms:${esc(member.phone.replace(/[^\d+]/g, ""))}">Text</a>` : ""}${member.email ? `<a class="contact-chip" href="mailto:${esc(member.email)}">Email</a>` : ""}<button class="text-button danger" data-action="delete-crew" data-id="${member.id}">Remove</button></div></div>`).join("")}
  <form class="tool-block" data-form="crew-save" data-id="${editing ? editing.id : ""}">
    <label class="field-label">${editing ? "Edit crew member" : "Add crew member"}</label>
    <input name="name" value="${esc(editing?.name || "")}" placeholder="Name" required>
    <div class="two-up"><div><input name="phone" type="tel" value="${esc(editing?.phone || "")}" placeholder="Phone number" aria-label="Crew phone"></div><div><input name="email" type="email" value="${esc(editing?.email || "")}" placeholder="Email address" aria-label="Crew email"></div></div>
    <button class="primary" type="submit">${editing ? "Save crew member" : "Add crew member"}</button>
    ${editing ? `<button class="text-button" type="button" data-action="cancel-crew-edit">Cancel edit</button>` : ""}
  </form>`;
}

function messagesHtml() {
  const editing = state.messages.find((message) => message.id === ui.editingMessageId);
  return `<div class="section-rule"><h2>Messages</h2><span>${state.messages.length}</span></div>
  <form class="tool-block" data-form="message-save" data-id="${editing ? editing.id : ""}">
    <label class="field-label">${editing ? "Edit message" : "Log a message"}</label>
    <div class="two-up"><div><label class="field-label">Customer</label><select name="customerId"><option value="">No customer</option>${state.customers.map((customer) => `<option value="${customer.id}" ${editing?.customerId === customer.id ? "selected" : ""}>${esc(customer.name)}</option>`).join("")}</select></div>
    <div><label class="field-label">Job</label><select name="jobId"><option value="">No job</option>${state.jobs.map((job) => `<option value="${job.id}" ${editing?.jobId === job.id ? "selected" : ""}>${esc(job.title)}</option>`).join("")}</select></div></div>
    <div class="two-up"><div><label class="field-label">Person</label><input name="person" value="${esc(editing?.person || "")}" placeholder="Who it was with"></div><div><label class="field-label">Platform</label><input name="platform" value="${esc(editing?.platform || "")}" placeholder="Text, email, Facebook…"></div></div>
    <label class="field-label">Message</label><textarea name="text" rows="3" required>${esc(editing?.text || "")}</textarea>
    <button class="primary" type="submit">${editing ? "Save message" : "Log message"}</button>
    ${editing ? `<button class="text-button" type="button" data-action="cancel-message-edit">Cancel edit</button>` : ""}
  </form>
  ${state.messages.length ? state.messages.map((message) => `<div class="record-row"><div class="who"><strong>${esc(message.person || customerById(message.customerId)?.name || "Message")}</strong><time>${stamp(message.createdAt)}</time></div><p>${esc(message.text)}</p><small>${esc(message.platform || "")}${message.jobId ? ` · ${esc(state.jobs.find((job) => job.id === message.jobId)?.title || "")}` : ""}</small><div><button class="text-button" data-action="edit-message" data-id="${message.id}">Edit</button><button class="text-button danger" data-action="delete-message" data-id="${message.id}">Delete</button></div></div>`).join("") : `<p class="empty">No messages logged yet.</p>`}`;
}

// ---------- Events ----------
function scrollToId(id) {
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}
function formData(form) {
  return new FormData(form);
}

if (typeof document !== "undefined") document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action === "dismiss-notice") { ui.notice = ""; render(); }
  else if (action === "tab") { ui.tab = target.dataset.tab; render(); window.scrollTo({ top: 0 }); }
  else if (action === "install") {
    if (ui.installPrompt) {
      ui.installPrompt.prompt();
      await ui.installPrompt.userChoice.catch(() => null);
      ui.installPrompt = null;
      render();
    } else {
      ui.showInstallHelp = true;
      render();
    }
  }
  else if (action === "close-install-help") { ui.showInstallHelp = false; render(); }
  else if (action === "lock") { unlocked = false; render(); }
  else if (action === "talk-listen") startDictation(null, true);
  else if (action === "dictate") startDictation(target.dataset.target, false);
  else if (action === "speak-note") { const note = state.notes.find((item) => item.id === id); if (note) speak(note.text); }
  else if (action === "edit-note") { ui.editingNoteId = id; render(); }
  else if (action === "cancel-note-edit") { ui.editingNoteId = null; render(); }
  else if (action === "delete-note") { if (confirm("Delete this note?")) commit((current) => { current.notes = current.notes.filter((item) => item.id !== id); }); }
  else if (action === "open-job") { ui.selectedJobId = id; ui.editingJobId = null; render(); scrollToId("job-detail"); }
  else if (action === "edit-job") { ui.selectedJobId = id; ui.editingJobId = id; render(); scrollToId("job-editor"); }
  else if (action === "close-job") { ui.selectedJobId = null; render(); }
  else if (action === "cancel-job-edit") { ui.editingJobId = null; render(); }
  else if (action === "delete-job") { if (confirm("Delete this job?")) commit((current) => { current.jobs = current.jobs.filter((item) => item.id !== id); ui.selectedJobId = null; ui.editingJobId = null; }); }
  else if (action === "job-status") commit((current) => { const job = current.jobs.find((item) => item.id === id); if (job) job.status = target.dataset.status; });
  else if (action === "send-job") {
    const packet = makeJobPacket(state, id);
    if (packet) { downloadJson(`fieldbook-job-${id}.json`, packet); setNotice("Job packet saved — it carries no prices. Text or email the file to crew."); }
  }
  else if (action === "delete-photo") {
    if (confirm("Delete this photo?")) commit((current) => {
      current.photos = current.photos.filter((photo) => photo.id !== id);
      current.jobs.forEach((job) => { job.photoIds = job.photoIds.filter((photoId) => photoId !== id); });
      current.estimates.forEach((estimate) => { estimate.photoIds = estimate.photoIds.filter((photoId) => photoId !== id); });
      current.notes.forEach((note) => { note.photoIds = (note.photoIds || []).filter((photoId) => photoId !== id); });
    });
  }
  else if (action === "open-rely") { ui.selectedRelyId = id; ui.editingRelyId = null; render(); scrollToId("rely-detail"); }
  else if (action === "edit-rely") { ui.selectedRelyId = id; ui.editingRelyId = id; render(); scrollToId("rely-editor"); }
  else if (action === "close-rely") { ui.selectedRelyId = null; render(); }
  else if (action === "cancel-rely-edit") { ui.editingRelyId = null; render(); }
  else if (action === "delete-rely") { if (confirm("Delete this work order?")) commit((current) => { current.relyOrders = current.relyOrders.filter((item) => item.id !== id); ui.selectedRelyId = null; ui.editingRelyId = null; }); }
  else if (action === "copy-claim") {
    const order = state.relyOrders.find((item) => item.id === id);
    if (order) { try { await copyText(order.claim); setNotice(`Claim ${order.claim} copied.`); } catch { setNotice("Copy was blocked — long-press the claim number to copy it."); } }
  }
  else if (action === "rely-sent") commit((current) => { const order = current.relyOrders.find((item) => item.id === id); if (order) { order.diagnosisSent = target.dataset.sent === "1"; order.diagnosisSentAt = order.diagnosisSent ? Date.now() : undefined; } });
  else if (action === "add-line") { const form = document.querySelector('form[data-form="estimate-save"]'); if (form) readEstimateForm(form); ensureDraft().items.push({ id: uid("item"), desc: "", qty: 1, price: 0 }); render(); }
  else if (action === "remove-line") { const form = document.querySelector('form[data-form="estimate-save"]'); if (form) readEstimateForm(form); ensureDraft().items = ensureDraft().items.filter((item) => item.id !== id); render(); }
  else if (action === "preview-estimate") { const form = document.querySelector('form[data-form="estimate-save"]'); if (form) readEstimateForm(form); ui.previewEstimate = true; render(); }
  else if (action === "close-preview") { ui.previewEstimate = false; render(); }
  else if (action === "new-estimate") { ui.estimateDraft = emptyEstimateDraft(); ui.readyLink = ""; render(); }
  else if (action === "edit-estimate") { const estimate = state.estimates.find((item) => item.id === id); if (estimate) { ui.estimateDraft = clone(estimate); ui.readyLink = ""; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } }
  else if (action === "copy-probuild") {
    const form = document.querySelector('form[data-form="estimate-save"]'); if (form) readEstimateForm(form);
    const draft = ensureDraft(); const customer = customerById(draft.customerId);
    if (!customer) { setNotice("Pick a customer first — the ProBuild copy carries the client and phone number."); return; }
    try { await copyText(probuildBlock(draft, customer, totalOf(draft.items))); setNotice("ProBuild copy copied — paste it into ProBuild so this estimate is backed up there too."); } catch { setNotice("Copy was blocked."); }
  }
  else if (action === "copy-client-link") {
    const form = document.querySelector('form[data-form="estimate-save"]'); if (form) readEstimateForm(form);
    const draft = ensureDraft(); const customer = customerById(draft.customerId);
    if (!customer) { setNotice("Pick a customer before making the client link."); return; }
    const payload = { id: draft.number, date: draft.date, client: customer.name, business: BUSINESS, phone: PHONE, items: draft.items.filter((item) => item.desc.trim()).map((item) => ({ desc: item.desc.trim(), qty: item.qty, price: item.price })), notes: draft.notes, total: totalOf(draft.items), photos: draft.photoIds.slice(0, 4).map(photoById).filter(Boolean).map((photo) => photo.dataUrl) };
    let encoded = encodeBase64Url(payload);
    while (encoded.length > 200000 && payload.photos.length) { payload.photos.pop(); encoded = encodeBase64Url(payload); }
    if (!payload.photos.length) delete payload.photos;
    const base = state.settings.estimateBaseUrl.trim() || `${location.origin}${location.pathname}`;
    const link = `${base.includes("#") ? base.slice(0, base.indexOf("#")) : base}#e=${encoded}`;
    try { await copyText(link); ui.readyLink = ""; setNotice("Client link copied."); } catch { ui.readyLink = link; setNotice("Link ready but copy was blocked — long-press the link to copy."); }
  }
  else if (action === "edit-invoice") { ui.editingInvoiceId = id; render(); }
  else if (action === "cancel-invoice-edit") { ui.editingInvoiceId = null; render(); }
  else if (action === "delete-invoice") { if (confirm("Delete this invoice?")) commit((current) => { current.invoices = current.invoices.filter((item) => item.id !== id); ui.editingInvoiceId = null; }); }
  else if (action === "open-customer") { ui.selectedCustomerId = id; render(); }
  else if (action === "edit-customer") { ui.editingCustomerId = id; ui.selectedCustomerId = null; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "close-customer") { ui.selectedCustomerId = null; render(); }
  else if (action === "cancel-customer-edit") { ui.editingCustomerId = null; render(); }
  else if (action === "export-master") { downloadJson(`fieldbook-master-pack-${today()}.json`, makePack(state, "master")); setNotice("Master pack saved. It carries prices and private notes — keep it private."); }
  else if (action === "export-crew") { downloadJson(`fieldbook-crew-pack-${today()}.json`, makePack(state, "crew")); setNotice("Crew pack saved — no prices in it. Send the file to crew; they import it on first open."); }
  else if (action === "edit-price") { ui.editingPriceId = id; render(); }
  else if (action === "cancel-price-edit") { ui.editingPriceId = null; render(); }
  else if (action === "delete-price") { if (confirm("Delete this price book item?")) commit((current) => { current.priceBook = current.priceBook.filter((item) => item.id !== id); ui.editingPriceId = null; }); }
  else if (action === "edit-crew") { ui.editingCrewId = id; render(); }
  else if (action === "cancel-crew-edit") { ui.editingCrewId = null; render(); }
  else if (action === "delete-crew") { if (confirm("Remove this crew member?")) commit((current) => { current.crew = current.crew.filter((item) => item.id !== id); current.jobs.forEach((job) => { job.crewIds = job.crewIds.filter((crewId) => crewId !== id); }); ui.editingCrewId = null; }); }
  else if (action === "edit-message") { ui.editingMessageId = id; render(); }
  else if (action === "cancel-message-edit") { ui.editingMessageId = null; render(); }
  else if (action === "delete-message") { if (confirm("Delete this message?")) commit((current) => { current.messages = current.messages.filter((item) => item.id !== id); ui.editingMessageId = null; }); }
});

if (typeof document !== "undefined") document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  const id = form.dataset.id;
  const data = formData(form);
  if (kind === "setup") {
    const pin = String(data.get("pin") || "");
    const pin2 = String(data.get("pin2") || "");
    const mode = event.submitter?.value || "master";
    if (!validPin(pin)) { ui.notice = "PIN must be 4–8 digits."; render(); return; }
    if (pin !== pin2) { ui.notice = "PINs do not match."; render(); return; }
    if (mode === "import" && !ui.pendingPack) { ui.notice = "Choose a pack file first."; render(); return; }
    await setPin(pin);
    state = mode === "import" ? ui.pendingPack.workspace : blankWorkspace(mode);
    ui.pendingPack = null;
    unlocked = true;
    await saveOffline(state);
    ui.notice = "Book open. It lives on this phone and works offline.";
    render();
  }
  else if (kind === "unlock") {
    if (await checkPin(String(data.get("pin") || ""))) { unlocked = true; ui.notice = ""; render(); }
    else { ui.notice = "Wrong PIN."; render(); }
  }
  else if (kind === "note-add") {
    const text = String(data.get("text") || "").trim();
    if (!text) return;
    commit((current) => { current.notes.unshift({ id: uid("note"), text, role: "you", photoIds: [], createdAt: Date.now() }); });
  }
  else if (kind === "note-edit") commit((current) => { const note = current.notes.find((item) => item.id === id); if (note) note.text = String(data.get("text") || ""); ui.editingNoteId = null; });
  else if (kind === "photo-note") commit((current) => { const photo = current.photos.find((item) => item.id === id); if (photo) photo.note = String(data.get("note") || ""); });
  else if (kind === "job-add") {
    const job = normalizeJob({ id: uid("job"), title: String(data.get("title") || "").trim(), customerId: String(data.get("customerId") || ""), jobType: String(data.get("jobType") || ""), appointment: String(data.get("appointment") || ""), status: "scheduled", createdAt: Date.now() });
    if (!job.title) { setNotice("Give the job a short name first."); return; }
    commit((current) => { current.jobs.unshift(job); ui.selectedJobId = job.id; ui.editingJobId = null; });
  }
  else if (kind === "job-edit") commit((current) => {
    const job = current.jobs.find((item) => item.id === id);
    if (!job) return;
    job.title = String(data.get("title") || job.title);
    job.customerId = String(data.get("customerId") || "");
    job.jobType = String(data.get("jobType") || "");
    job.appointment = String(data.get("appointment") || "");
    job.address = String(data.get("address") || "");
    job.status = String(data.get("status") || "scheduled");
    job.crewIds = data.getAll("crew").map(String);
    job.findings = String(data.get("findings") || "");
    job.materials = String(data.get("materials") || "");
    job.nextStep = String(data.get("nextStep") || "");
    job.notes = String(data.get("notes") || "");
    ui.editingJobId = null;
    ui.selectedJobId = job.id;
  });
  else if (kind === "rely-add") {
    const customerName = String(data.get("customerName") || "").trim();
    const appliance = String(data.get("appliance") || "").trim();
    if (!customerName && !appliance) { setNotice("Add at least the customer name or the appliance."); return; }
    const claim = String(data.get("claim") || "").trim();
    const order = { id: uid("rely"), customerName, address: "", phone: "", email: "", claim, appointment: String(data.get("appointment") || ""), appliance, issue: "", serviceFee: "", authLimit: 100, diagnosis: "", diagnosisSent: false, payStatus: "scheduled", missingWorkOrder: !claim, createdAt: Date.now() };
    commit((current) => { current.relyOrders.unshift(order); ui.selectedRelyId = order.id; });
  }
  else if (kind === "rely-edit") commit((current) => {
    const order = current.relyOrders.find((item) => item.id === id);
    if (!order) return;
    order.customerName = String(data.get("customerName") || "");
    order.address = String(data.get("address") || "");
    order.phone = String(data.get("phone") || "");
    order.email = String(data.get("email") || "");
    order.claim = String(data.get("claim") || "");
    order.missingWorkOrder = order.missingWorkOrder && !order.claim.trim();
    order.appointment = String(data.get("appointment") || "");
    order.appliance = String(data.get("appliance") || "");
    if (isMaster()) { order.serviceFee = String(data.get("serviceFee") || ""); order.authLimit = Number(data.get("authLimit")) || 0; }
    order.issue = String(data.get("issue") || "");
    order.payStatus = String(data.get("payStatus") || "scheduled");
    const diagnosis = String(data.get("diagnosis") || "");
    if (diagnosis !== order.diagnosis) { order.diagnosis = diagnosis; order.diagnosisSent = false; order.diagnosisSentAt = undefined; }
    ui.editingRelyId = null;
    ui.selectedRelyId = order.id;
  });
  else if (kind === "estimate-save") {
    const draft = readEstimateForm(form);
    if (!customerById(draft.customerId)) { setNotice("Pick a customer before saving the estimate."); return; }
    if (!draft.items.some((item) => item.desc.trim())) { setNotice("Add at least one line item."); return; }
    commit((current) => { current.estimates = [clone(draft), ...current.estimates.filter((item) => item.id !== draft.id)]; });
    setNotice(`${draft.number} saved.`);
  }
  else if (kind === "invoice-save") commit((current) => {
    const value = { number: String(data.get("number") || ""), customerId: String(data.get("customerId") || ""), estimateId: String(data.get("estimateId") || ""), date: String(data.get("date") || today()), amount: Number(data.get("amount")) || 0, status: String(data.get("status") || "draft"), notes: String(data.get("notes") || "") };
    if (id) { const invoice = current.invoices.find((item) => item.id === id); if (invoice) Object.assign(invoice, value); }
    else current.invoices.unshift({ id: uid("invoice"), ...value, createdAt: Date.now() });
    ui.editingInvoiceId = null;
  });
  else if (kind === "customer-save") {
    const name = String(data.get("name") || "").trim();
    if (!name) { setNotice("Add the customer's name first."); return; }
    commit((current) => {
      const value = { name, address: String(data.get("address") || "").trim(), phone: String(data.get("phone") || "").trim(), email: String(data.get("email") || "").trim() };
      if (id) { const customer = current.customers.find((item) => item.id === id); if (customer) Object.assign(customer, value); ui.selectedCustomerId = id; }
      else { const customer = { id: uid("customer"), ...value, createdAt: Date.now() }; current.customers.unshift(customer); ui.selectedCustomerId = customer.id; }
      ui.editingCustomerId = null;
    });
  }
  else if (kind === "price-save") commit((current) => {
    const value = { name: String(data.get("name") || "").trim(), price: Number(data.get("price")) || 0, unit: String(data.get("unit") || ""), source: String(data.get("source") || ""), checked: String(data.get("checked") || ""), notes: String(data.get("notes") || "") };
    if (!value.name) return;
    if (id) { const item = current.priceBook.find((entry) => entry.id === id); if (item) Object.assign(item, value); }
    else current.priceBook.unshift({ id: uid("price"), ...value, createdAt: Date.now() });
    ui.editingPriceId = null;
  });
  else if (kind === "crew-save") commit((current) => {
    const value = { name: String(data.get("name") || "").trim(), phone: String(data.get("phone") || "").trim(), email: String(data.get("email") || "").trim() };
    if (!value.name) return;
    if (id) { const member = current.crew.find((item) => item.id === id); if (member) Object.assign(member, value); }
    else current.crew.push({ id: uid("crew"), ...value });
    ui.editingCrewId = null;
  });
  else if (kind === "message-save") commit((current) => {
    const value = { customerId: String(data.get("customerId") || ""), jobId: String(data.get("jobId") || ""), person: String(data.get("person") || ""), platform: String(data.get("platform") || ""), text: String(data.get("text") || "").trim() };
    if (!value.text) return;
    if (id) { const message = current.messages.find((item) => item.id === id); if (message) Object.assign(message, value); }
    else current.messages.unshift({ id: uid("message"), ...value, createdAt: Date.now() });
    ui.editingMessageId = null;
  });
  else if (kind === "estimate-url") commit((current) => { current.settings.estimateBaseUrl = String(data.get("url") || "").trim(); });
  else if (kind === "change-pin") {
    if (!(await checkPin(String(data.get("current") || "")))) { setNotice("Current PIN is wrong."); return; }
    const next = String(data.get("next") || "");
    if (!validPin(next)) { setNotice("New PIN must be 4–8 digits."); return; }
    await setPin(next);
    setNotice("PIN changed.");
  }
});

if (typeof document !== "undefined") document.addEventListener("change", async (event) => {
  const target = event.target.closest("[data-change]");
  if (!target) return;
  const kind = target.dataset.change;
  const file = target.files?.[0];
  if (!file) return;
  if (kind === "setup-pack-file" || kind === "import-pack-file") {
    try {
      const parsed = parsePack(await file.text());
      if (kind === "setup-pack-file") {
        ui.pendingPack = parsed;
        ui.notice = "";
        render();
      } else if (parsed.kind === "fieldbook-job-packet") {
        commit((current) => { const merged = mergeJobPacket(current, parsed.workspace); Object.assign(current, merged); });
        setNotice("Job packet imported — no prices in it.");
      } else if (confirm(`Replace this phone's book with the ${parsed.role} pack?`)) {
        state = parsed.workspace;
        state.updatedAt = Date.now();
        await saveOffline(state);
        ui.estimateDraft = null;
        setNotice(`${parsed.role === "crew" ? "Crew" : "Master"} pack imported.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That pack could not be read.");
    }
    target.value = "";
    return;
  }
  if (kind === "talk-photo" || kind === "job-photo") {
    try {
      const photo = { id: uid("photo"), dataUrl: await resizeFile(file), note: "", createdAt: Date.now() };
      if (kind === "talk-photo") {
        commit((current) => { current.photos.unshift(photo); current.notes.unshift({ id: uid("note"), text: "Photo note", role: "you", photoIds: [photo.id], createdAt: Date.now() }); });
      } else {
        const jobId = target.dataset.id;
        commit((current) => { current.photos.unshift(photo); const job = current.jobs.find((item) => item.id === jobId); if (job) job.photoIds.push(photo.id); });
      }
    } catch {
      setNotice("That photo could not be saved. Try another one.");
    }
    target.value = "";
  }
});

if (typeof document !== "undefined") document.addEventListener("input", (event) => {
  const target = event.target.closest("[data-input]");
  if (!target) return;
  if (target.dataset.input === "customer-search") {
    ui.customerQuery = target.value;
    const cursor = target.selectionStart;
    render();
    const field = document.getElementById("customer-search");
    if (field) { field.focus(); field.setSelectionRange(cursor, cursor); }
  }
});

// ---------- Boot ----------
if (typeof document !== "undefined") {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
  }
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); ui.installPrompt = event; if (state && unlocked) render(); });
  window.addEventListener("online", () => { if (state && unlocked) render(); });
  window.addEventListener("offline", () => { if (state && unlocked) render(); });
  window.addEventListener("hashchange", render);
  void (async () => {
    const stored = await loadOffline();
    if (stored) {
      state = normalizeWorkspace(stored, stored.role === "crew" ? "crew" : "master");
      unlocked = !pinRecord();
      if (unlocked) await saveOffline(state);
    }
    render();
  })();
}
