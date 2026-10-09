const GH = { owner: "plushshelf", repo: "plushshelf.github.io" };
const TOKEN = "plushshelf-gh-token";
if (!localStorage.getItem(TOKEN) && localStorage.getItem("jellycat-gh-token")) {
  localStorage.setItem(TOKEN, localStorage.getItem("jellycat-gh-token"));
}
function headers(token) {
  return { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" };
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}
async function valid(token) {
  if (!token) return false;
  try {
    const res = await fetch("https://api.github.com/repos/" + GH.owner + "/" + GH.repo, { headers: headers(token), cache: "no-store" });
    if (!res.ok) return false;
    const repo = await res.json();
    return !!(repo.permissions && repo.permissions.push);
  } catch (e) {
    return false;
  }
}
function goHome() { location.replace("../"); }
async function showList() {
  document.getElementById("msg").textContent = "已驗證";
  document.getElementById("gate").classList.add("hidden");
  const box = document.getElementById("list");
  box.classList.remove("hidden");
  const res = await fetch("../categories.json?ts=" + Date.now(), { cache: "no-store" });
  const list = await res.json();
  box.innerHTML = list.map(function (c) {
    return "<a class=\"brand\" href=\"" + esc(c.cms) + "\"><b>" + esc(c.name) + "</b><span>編輯這個品牌的清單</span></a>";
  }).join("");
}
(async function () {
  const saved = localStorage.getItem(TOKEN) || "";
  if (saved) {
    if (await valid(saved)) { showList(); return; }
    localStorage.removeItem(TOKEN);
    goHome();
    return;
  }
  document.getElementById("msg").textContent = "請貼上有這個 repo 寫入權限的 token";
  document.getElementById("gate").classList.remove("hidden");
})();
document.getElementById("gate").addEventListener("submit", async function (e) {
  e.preventDefault();
  const token = document.getElementById("token").value.trim();
  document.getElementById("msg").textContent = "驗證中…";
  if (!(await valid(token))) { localStorage.removeItem(TOKEN); goHome(); return; }
  localStorage.setItem(TOKEN, token);
  showList();
});
