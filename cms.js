document.getElementById("year").textContent = String(new Date().getFullYear());
const CFG = window.PLUSH || {};
const GH = { owner: "plushshelf", repo: "plushshelf.github.io", branch: "main", path: CFG.path || "data.json" };
const DRAFT = "plushshelf-draft-" + (CFG.slug || "item");
const TOKEN = "plushshelf-gh-token";
if (!localStorage.getItem(TOKEN) && localStorage.getItem("jellycat-gh-token")) {
  localStorage.setItem(TOKEN, localStorage.getItem("jellycat-gh-token"));
}
document.title = "管理 " + (CFG.name || "") + " · 公仔架";
const h1 = document.querySelector("h1");
if (h1 && CFG.name) h1.textContent = CFG.name + " 管理";
let items = [];
let editing = null;
let dirty = false;
let ready = false;
function syncChips() {
  document.querySelectorAll(".chips").forEach(function (row) {
    const target = document.getElementById(row.dataset.target);
    if (!target) return;
    row.querySelectorAll("button").forEach(function (btn) {
      btn.classList.toggle("on", btn.dataset.value === target.value);
    });
  });
}

function setStatus(text) {
  const el = document.getElementById("syncStatus");
  if (el) el.textContent = text || "";
}
function driveId(url) {
  if (!url) return "";
  const m = String(url).match(/\/d\/([^/]+)/) || String(url).match(/[?&]id=([^&]+)/);
  return m ? m[1] : "";
}
function thumb(url, size) {
  const id = driveId(url);
  return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + (size || 800) : "";
}
function money(n) { return n === "" || n == null ? "—" : "HK$" + Number(n).toLocaleString("en-HK"); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}
function byId(id) { return items.filter(function (i) { return String(i.id) === String(id); })[0]; }
function tags(item) {
  const s = item && item.series;
  if (Array.isArray(s)) return s.map(function (x) { return String(x).trim(); }).filter(Boolean);
  if (s == null || String(s).trim() === "") return [];
  return [String(s).trim()];
}
function seriesBadges(item) {
  const list = tags(item);
  if (!list.length) return "<span class=\"badge\">未分類</span>";
  return list.map(function (s) { return "<span class=\"badge\">" + esc(s) + "</span>"; }).join("");
}
function markDirty() {
  dirty = true;
  localStorage.setItem(DRAFT, JSON.stringify(items));
  setStatus("有尚未上傳的修改");
}
function render() {
  if (!ready) return;
  const q = document.getElementById("q").value.trim().toLowerCase();
  const series = document.getElementById("series").value;
  const status = document.getElementById("status").value;
  const size = document.getElementById("size").value;
  const seriesSet = [];
  items.forEach(function (i) { tags(i).forEach(function (s) { if (seriesSet.indexOf(s) < 0) seriesSet.push(s); }); });
  seriesSet.sort();
  const sel = document.getElementById("series");
  sel.innerHTML = "<option value=\"\">全部系列</option>" + seriesSet.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
  if (seriesSet.indexOf(series) >= 0) sel.value = series;
  document.getElementById("seriesList").innerHTML = seriesSet.map(function (s) { return "<option value=\"" + esc(s) + "\">"; }).join("");
  const shown = items.filter(function (i) {
    const blob = [i.id, i.name, tags(i).join(" "), i.color, i.note, i.linkLabel, i.size].join(" ").toLowerCase();
    if (q && blob.indexOf(q) < 0) return false;
    if (sel.value && tags(i).indexOf(sel.value) < 0) return false;
    if (size && i.size !== size) return false;
    if (status === "sold" && !i.sold) return false;
    if (status === "hold" && !(i.hold && !i.sold)) return false;
    if (status === "available" && (i.hold || i.sold)) return false;
    return true;
  }).sort(function (a, b) { return a.id - b.id; });
  function sum(list) { return list.reduce(function (n, i) { return n + (Number(i.price) || 0); }, 0); }
  const available = items.filter(function (i) { return !i.hold && !i.sold; });
  const holds = items.filter(function (i) { return i.hold && !i.sold; });
  const solds = items.filter(function (i) { return i.sold; });
  document.getElementById("count").textContent = String(items.length);
  document.getElementById("stats").innerHTML = [
    ["全部", items.length, sum(items)],
    ["可售", available.length, sum(available)],
    ["Hold", holds.length, sum(holds)],
    ["Sold", solds.length, sum(solds)],
    ["顯示中", shown.length, sum(shown)]
  ].map(function (row) {
    const showMoney = document.body.classList.contains("manage") && document.body.classList.contains("authed");
    return "<div class=\"stat\"><b>" + row[1] + "</b><span>" + row[0] + (showMoney ? " · " + money(row[2]) : "") + "</span></div>";
  }).join("");
  syncChips();
  const grid = document.getElementById("grid");
  if (!shown.length) { grid.innerHTML = "<div class=\"empty\">沒有符合的項目</div>"; return; }
  grid.innerHTML = shown.map(function (i) {
    const photos = [i.imageUrl, i.image2Url].filter(Boolean);
    const cls = "card" + (i.sold ? " sold" : "") + (i.hold && !i.sold ? " hold" : "");
    const badge = i.sold ? "<span class=\"badge sold\">Sold</span>" : i.hold ? "<span class=\"badge hold\">Hold</span>" : "<span class=\"badge\">可售</span>";
    const imgs = photos.map(function (u, idx) {
      return "<button type=\"button\" class=\"shot\" data-act=\"view\" data-id=\"" + i.id + "\" data-idx=\"" + idx + "\"><img alt=\"" + esc(i.name) + "\" src=\"" + esc(thumb(u)) + "\"></button>";
    }).join("");
    const link = i.linkUrl ? "<a href=\"" + esc(i.linkUrl) + "\" target=\"_blank\" rel=\"noopener\">" + esc("參考連結") + "</a>" : esc(i.linkLabel || "");
    return "<article class=\"" + cls + "\"><div class=\"photos" + (photos.length > 1 ? " two" : "") + "\">" + imgs + "</div><div class=\"body\"><div class=\"badges\">" + badge + seriesBadges(i) + "<span class=\"badge\">" + esc(i.size || "") + "</span></div><h2 class=\"name\">" + esc(i.name) + "</h2><div class=\"price\">" + money(i.price) + " · #" + esc(i.id) + "</div><div class=\"meta\">" + esc(i.color || "") + (i.note ? " · " + esc(i.note) : "") + "</div><div class=\"meta\">" + link + "</div><div class=\"actions\"><button class=\"auth-only\" data-act=\"hold\" data-id=\"" + i.id + "\">" + (i.hold ? "取消 Hold" : "Hold") + "</button><button class=\"auth-only\" data-act=\"sold\" data-id=\"" + i.id + "\">" + (i.sold ? "取消 Sold" : "Sold") + "</button><button class=\"auth-only\" data-act=\"edit\" data-id=\"" + i.id + "\">編輯</button></div></div></article>";
  }).join("");
}
function tokenValue() { return document.getElementById("token").value.trim(); }
function ghHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function pushGithub() {
  const token = tokenValue();
  if (!token) { alert("請先貼上 GitHub token"); return; }
  localStorage.setItem(TOKEN, token);
  const btn = document.getElementById("pushBtn");
  btn.disabled = true;
  setStatus("上傳中…");
  try {
    const api = "https://api.github.com/repos/" + GH.owner + "/" + GH.repo + "/contents/" + GH.path;
    const headers = ghHeaders(token);
    const get = await fetch(api + "?ref=" + encodeURIComponent(GH.branch), { headers: headers, cache: "no-store" });
    let sha = "";
    if (get.status === 401 || get.status === 403) {
      setAuthed(false);
      localStorage.removeItem(TOKEN);
      const err = await get.json().catch(function () { return {}; });
      throw new Error(err.message || "token 無效或沒有權限");
    }
    if (get.ok) {
      sha = (await get.json()).sha;
    } else if (get.status !== 404) {
      const err = await get.json().catch(function () { return {}; });
      throw new Error(err.message || "讀取 data.json 失敗");
    }
    const body = {
      message: "Update listing",
      content: b64(JSON.stringify(items, null, 2) + "\n"),
      branch: GH.branch
    };
    if (sha) body.sha = sha;
    const put = await fetch(api, { method: "PUT", headers: headers, body: JSON.stringify(body) });
    if (!put.ok) {
      const err = await put.json().catch(function () { return {}; });
      throw new Error(err.message || "上傳失敗");
    }
    localStorage.removeItem(DRAFT);
    dirty = false;
    setStatus("已上傳。約一分鐘後重新整理公開頁。");
  } catch (err) {
    setStatus(err.message || "上傳失敗");
    alert(err.message || "上傳失敗");
  } finally {
    btn.disabled = false;
  }
}
async function loadPublished() {
  const res = await fetch((CFG.data || "../data.json") + "?ts=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("讀不到 data.json");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("data.json 格式不正確");
  return data;
}
document.getElementById("grid").addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const item = byId(btn.dataset.id);
  if (!item) return;
  if (btn.dataset.act === "view") return openPreview(item, Number(btn.dataset.idx) || 0);
  if (btn.dataset.act === "hold") { item.hold = !item.hold; if (item.hold) item.sold = false; }
  if (btn.dataset.act === "sold") { item.sold = !item.sold; if (item.sold) item.hold = false; }
  if (btn.dataset.act === "edit") return openForm(item);
  markDirty(); render();
});
["q","series","status","size"].forEach(function (id) { document.getElementById(id).addEventListener("input", render); });
document.querySelectorAll(".chips").forEach(function (row) {
  row.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const target = document.getElementById(row.dataset.target);
    if (!target) return;
    target.value = btn.dataset.value;
    render();
  });
});
function setAuthed(on) {
  document.body.classList.toggle("authed", !!on);
  if (items.length) render();
}
async function verifyToken() {
  const token = tokenValue();
  if (!token) {
    setAuthed(false);
    localStorage.removeItem(TOKEN);
    setStatus("請貼上 token");
    return false;
  }
  setStatus("驗證中…");
  try {
    const res = await fetch("https://api.github.com/repos/" + GH.owner + "/" + GH.repo, { headers: ghHeaders(token), cache: "no-store" });
    if (!res.ok) {
      setAuthed(false);
      localStorage.removeItem(TOKEN);
      setStatus(res.status === 401 ? "token 無效" : "token 沒有這個 repo 的權限");
      return false;
    }
    const repo = await res.json();
    if (!repo.permissions || !repo.permissions.push) {
      setAuthed(false);
      localStorage.removeItem(TOKEN);
      setStatus("token 沒有寫入權限");
      return false;
    }
    localStorage.setItem(TOKEN, token);
    setAuthed(true);
    setStatus(dirty ? "有尚未上傳的修改" : "已驗證");
    return true;
  } catch (err) {
    setAuthed(false);
    setStatus("驗證失敗");
    return false;
  }
}
document.getElementById("addBtn").onclick = function () { openForm(null); };
document.getElementById("cancelBtn").onclick = function () { document.getElementById("dlg").close(); };
document.getElementById("delBtn").onclick = function () {
  if (!editing) return;
  if (!confirm("刪除這件？")) return;
  items = items.filter(function (i) { return i !== editing; });
  markDirty(); document.getElementById("dlg").close(); render();
};
function openForm(item) {
  editing = item;
  const f = document.getElementById("form");
  document.getElementById("dlgTitle").textContent = item ? "編輯" : "新增";
  document.getElementById("delBtn").style.visibility = item ? "visible" : "hidden";
  const maxId = items.reduce(function (n, i) { return Math.max(n, Number(i.id) || 0); }, 0);
  const blank = {id:maxId+1,name:"",price:"",series:[],size:"",color:"",note:"",linkLabel:"參考連結",linkUrl:"",imageName:"",imageUrl:"",image2Name:"",image2Url:"",hold:false,sold:false};
  const src = item || blank;
  Array.prototype.forEach.call(f.elements, function (el) {
    if (!el.name) return;
    if (el.type === "checkbox") el.checked = !!src[el.name];
    else el.value = src[el.name] == null ? "" : src[el.name];
  });
  seriesTags = tags(src);
  paintSeriesTags();
  document.getElementById("seriesInput").value = "";
  document.getElementById("dlg").showModal();
}
let seriesTags = [];
function paintSeriesTags() {
  document.getElementById("seriesTags").innerHTML = seriesTags.map(function (s, idx) {
    return "<button type=\"button\" data-i=\"" + idx + "\">" + esc(s) + " ×</button>";
  }).join("");
}
function addSeriesFromInput() {
  const input = document.getElementById("seriesInput");
  String(input.value || "").split(/[,，]/).forEach(function (part) {
    const s = part.trim();
    if (s && seriesTags.indexOf(s) < 0) seriesTags.push(s);
  });
  input.value = "";
  paintSeriesTags();
}
document.getElementById("addSeries").onclick = addSeriesFromInput;
document.getElementById("seriesInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); addSeriesFromInput(); }
});
document.getElementById("seriesTags").onclick = function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  seriesTags.splice(Number(btn.dataset.i), 1);
  paintSeriesTags();
};
document.getElementById("form").onsubmit = function (e) {
  e.preventDefault();
  addSeriesFromInput();
  const fd = new FormData(e.target);
  const obj = {
    id: Number(fd.get("id")),
    name: String(fd.get("name") || "").trim(),
    price: fd.get("price") === "" ? "" : Number(fd.get("price")),
    series: seriesTags.slice(),
    size: String(fd.get("size") || "").trim(),
    color: String(fd.get("color") || "").trim(),
    note: String(fd.get("note") || "").trim(),
    linkLabel: String(fd.get("linkLabel") || "").trim(),
    linkUrl: String(fd.get("linkUrl") || "").trim(),
    imageName: String(fd.get("imageName") || "").trim(),
    imageUrl: String(fd.get("imageUrl") || "").trim(),
    image2Name: String(fd.get("image2Name") || "").trim(),
    image2Url: String(fd.get("image2Url") || "").trim(),
    hold: fd.get("hold") === "on",
    sold: fd.get("sold") === "on"
  };
  if (obj.hold && obj.sold) obj.hold = false;
  if (items.some(function (i) { return i !== editing && Number(i.id) === obj.id; })) { alert("編號已存在"); return; }
  if (editing) Object.assign(editing, obj); else items.push(obj);
  markDirty(); document.getElementById("dlg").close(); render();
};
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type: type || "text/plain"}));
  a.download = name; a.click();
}
document.getElementById("exportJson").onclick = function () { download("data.json", JSON.stringify(items, null, 2) + "\n", "application/json"); };
document.getElementById("importJson").onclick = function () { document.getElementById("file").click(); };
document.getElementById("file").onchange = function (e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    const data = JSON.parse(String(reader.result));
    if (!Array.isArray(data)) { alert("JSON 必須是陣列"); return; }
    items = data; markDirty(); render();
  };
  reader.readAsText(file);
  e.target.value = "";
};
let preview = null;
function previewPhotos(item) { return [item.imageUrl, item.image2Url].filter(Boolean); }
function paintPreview() {
  const item = byId(preview.id);
  if (!item) return closePreview();
  const photos = previewPhotos(item);
  if (!photos.length) return closePreview();
  if (preview.idx < 0) preview.idx = photos.length - 1;
  if (preview.idx >= photos.length) preview.idx = 0;
  const img = document.getElementById("lbImg");
  img.src = thumb(photos[preview.idx], 1600);
  img.alt = item.name;
  document.getElementById("lbName").textContent = item.name;
  document.getElementById("lbMeta").textContent = [money(item.price), tags(item).join("、"), item.color].filter(Boolean).join(" · ");
  const multi = photos.length > 1;
  document.getElementById("lbCount").textContent = multi ? (preview.idx + 1) + " / " + photos.length : "";
  document.getElementById("lbPrev").hidden = !multi;
  document.getElementById("lbNext").hidden = !multi;
}
function openPreview(item, idx) {
  if (!previewPhotos(item).length) return;
  preview = { id: item.id, idx: idx || 0 };
  paintPreview();
  document.getElementById("lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}
function closePreview() {
  preview = null;
  document.getElementById("lightbox").hidden = true;
  document.body.style.overflow = "";
}
document.getElementById("lbClose").onclick = closePreview;
document.getElementById("lbBackdrop").onclick = closePreview;
document.getElementById("lbPrev").onclick = function () { if (!preview) return; preview.idx -= 1; paintPreview(); };
document.getElementById("lbNext").onclick = function () { if (!preview) return; preview.idx += 1; paintPreview(); };
document.addEventListener("keydown", function (e) {
  if (!preview) return;
  if (e.key === "Escape") closePreview();
  if (e.key === "ArrowLeft") { preview.idx -= 1; paintPreview(); }
  if (e.key === "ArrowRight") { preview.idx += 1; paintPreview(); }
});
document.getElementById("pushBtn").onclick = pushGithub;
document.getElementById("resetBtn").onclick = async function () {
  if (!confirm("還原成網站上已發布的 data.json？尚未上傳的修改會消失。")) return;
  try {
    items = await loadPublished();
    localStorage.removeItem(DRAFT);
    dirty = false;
    setStatus("已還原成發布版本");
    render();
  } catch (err) {
    alert(err.message || "還原失敗");
  }
};
document.body.classList.add("manage");
document.getElementById("grid").innerHTML = "<div class=\"empty\">驗證中…</div>";
(async function boot() {
  const saved = localStorage.getItem(TOKEN) || "";
  document.getElementById("token").value = saved;
  const ok = await verifyToken();
  if (!ok) { location.replace(CFG.home || "../"); return; }
  try {
    const data = await loadPublished();
    const draft = localStorage.getItem(DRAFT);
    if (draft) {
      try { items = JSON.parse(draft); dirty = true; setStatus("有尚未上傳的修改"); }
      catch (e) { items = data; }
    } else {
      items = data;
    }
    ready = true;
    render();
  } catch (err) {
    document.getElementById("grid").innerHTML = "<div class=\"empty\">" + esc(err.message || "讀不到 data.json") + "</div>";
  }
})();
