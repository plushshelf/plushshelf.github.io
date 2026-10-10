document.getElementById("year").textContent = String(new Date().getFullYear());
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}
fetch("categories.json?ts=" + Date.now(), { cache: "no-store" }).then(function (res) {
  if (!res.ok) throw new Error("讀不到品牌清單");
  return res.json();
}).then(function (list) {
  const box = document.getElementById("brands");
  if (!list.length) { box.innerHTML = "<div class=\"empty\">尚未加入品牌</div>"; return; }
  box.innerHTML = list.map(function (c) {
    const cover = c.image
      ? "<div class=\"cover\" style=\"background-image:url('" + esc(c.image) + "')\"></div>"
      : "<div class=\"cover\"></div>";
    return "<a class=\"brand\" href=\"" + esc(c.public) + "\">" + cover + "<span class=\"copy\"><strong>" + esc(c.name) + "</strong><small>" + esc(c.note || "") + "</small><span class=\"go\">進入清單</span></span></a>";
  }).join("");
}).catch(function (err) {
  document.getElementById("brands").innerHTML = "<div class=\"empty\">" + esc(err.message || "讀不到品牌清單") + "</div>";
});
