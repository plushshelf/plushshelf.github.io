document.getElementById("year").textContent = String(new Date().getFullYear());
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}
function driveId(url) {
  if (!url) return "";
  const m = String(url).match(/\/d\/([^/]+)/) || String(url).match(/[?&]id=([^&]+)/);
  return m ? m[1] : "";
}
function coverUrl(url) {
  const id = driveId(url);
  return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w1200" : url;
}
fetch("categories.json?ts=" + Date.now(), { cache: "no-store" }).then(function (res) {
  if (!res.ok) throw new Error("讀不到品牌清單");
  return res.json();
}).then(function (list) {
  const box = document.getElementById("brands");
  if (!list.length) { box.innerHTML = "<div class=\"empty\">尚未加入品牌</div>"; return; }
  box.innerHTML = list.map(function (c) {
    const src = coverUrl(c.image || "");
    const cover = src
      ? "<div class=\"cover\" style=\"background-image:url('" + esc(src) + "')\"></div>"
      : "<div class=\"cover\"></div>";
    return "<a class=\"brand\" href=\"" + esc(c.public) + "\">" + cover + "<span class=\"copy\"><strong>" + esc(c.name) + "</strong><small>" + esc(c.note || "") + "</small><span class=\"go\">進入清單</span></span></a>";
  }).join("");
}).catch(function (err) {
  document.getElementById("brands").innerHTML = "<div class=\"empty\">" + esc(err.message || "讀不到品牌清單") + "</div>";
});
