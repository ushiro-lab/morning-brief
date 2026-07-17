const articles = [
  { category: "国内経済", title: "国内経済の注目記事を選んでください", summary: "SmartNewsで確認した経済ニュースの見出しを貼り付けると、朝のブリーフに追加できます。", source: "SmartNews", minutes: "確認待ち", selected: true },
  { category: "国内経済", title: "国内企業・雇用・物価に関する話題", summary: "国内経済の動きを中心に、気になる記事を選択してください。", source: "SmartNews", minutes: "確認待ち", selected: true },
  { category: "山口県", title: "山口県内のニュースを選んでください", summary: "県内の行政、企業、暮らしに関する話題を優先します。", source: "SmartNews", minutes: "確認待ち", selected: true },
  { category: "山口県", title: "山口県公式の報道発表", summary: "下のRSS読み込みボタンから、県公式の新着情報も確認できます。", source: "山口県", minutes: "確認待ち", selected: true },
  { category: "山口県", title: "地域経済・地域の暮らしに関する話題", summary: "気になる記事を5本目として追加してください。", source: "SmartNews", minutes: "確認待ち", selected: true }
];
const categories = ["国内経済", "山口県"];
const activeCategories = new Set(categories);
let utterance, startedAt, timer, estimatedSeconds = 180;
const list = document.querySelector("#newsList");
const count = document.querySelector("#storyCount");
const playButton = document.querySelector("#playButton");
const status = document.querySelector("#playerStatus");

function saveState() { localStorage.setItem("morningBriefArticles", JSON.stringify(articles)); localStorage.setItem("morningBriefTime", document.querySelector("#deliveryTime").value); localStorage.setItem("morningBriefAuto", document.querySelector("#autoCreate").checked); }
function render() {
  list.innerHTML = articles.map((a, i) => `<label class="article"><input data-index="${i}" type="checkbox" ${a.selected ? "checked" : ""}><span class="category">${a.category}</span><span><h3>${a.title}</h3><p>${a.summary}</p><span class="meta">${a.source} ・ ${a.minutes}</span></span></label>`).join("");
  const selected = articles.filter(a => a.selected).length;
  count.textContent = selected;
  document.querySelector("#createBrief").disabled = selected === 0;
}
function buildScript() {
  const chosen = articles.filter(a => a.selected);
  const items = chosen.map((a, i) => `続いて${i + 1}つ目は、${a.category}の話題です。${a.title}。${a.summary} このニュースで押さえておきたいのは、今日の仕事や暮らしにどんな変化があり得るかという点です。詳細は日中に一次情報も確認すると安心です。`).join(" ");
  const closing = "ここまでが今朝のポイントです。すべてを追いかける必要はありません。気になる話題を一つだけ選んで、あとで少し深く読む時間をつくるのがおすすめです。それでは、よい一日をお過ごしください。";
  return `おはようございます。今日のモーニングブリーフです。今朝は${chosen.length}つのニュースを、背景と注目点を交えながらお届けします。通勤や朝の支度の合間に、無理なく聞いてください。 ${items} ${closing}`;
}
function format(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function updateProgress() { const elapsed = Math.min(estimatedSeconds, Math.floor((Date.now() - startedAt) / 1000)); document.querySelector("#elapsed").textContent = format(elapsed); document.querySelector("#progressBar").style.width = `${elapsed / estimatedSeconds * 100}%`; if (elapsed >= estimatedSeconds) stop(); }
function stop() { window.speechSynthesis.cancel(); clearInterval(timer); playButton.textContent = "再生"; status.textContent = "再生を終了しました"; }
function toast(message) { const el = document.querySelector("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); }

list.addEventListener("change", event => { articles[event.target.dataset.index].selected = event.target.checked; saveState(); render(); });
document.querySelector("#selectAll").addEventListener("click", () => { articles.forEach(a => a.selected = true); saveState(); render(); });
document.querySelector("#categoryButtons").innerHTML = categories.map(c => `<button class="chip ${activeCategories.has(c) ? "active" : ""}">${c}</button>`).join("");
document.querySelector("#categoryButtons").addEventListener("click", e => { if (!e.target.matches(".chip")) return; e.target.classList.toggle("active"); });
document.querySelector("#createBrief").addEventListener("click", () => { estimatedSeconds = Math.max(60, articles.filter(a => a.selected).length * 45); document.querySelector("#duration").textContent = format(estimatedSeconds); document.querySelector("#elapsed").textContent = "0:00"; document.querySelector("#progressBar").style.width = "0%"; playButton.disabled = false; status.textContent = "原稿を作成しました。端末の声で再生できます。"; toast("無料の端末音声でブリーフを作成しました"); });
playButton.addEventListener("click", () => { if (window.speechSynthesis.speaking) { stop(); return; } utterance = new SpeechSynthesisUtterance(buildScript()); utterance.lang = "ja-JP"; utterance.rate = 0.85; utterance.onend = () => { clearInterval(timer); playButton.textContent = "再生"; status.textContent = "再生が完了しました"; }; startedAt = Date.now(); timer = setInterval(updateProgress, 250); window.speechSynthesis.speak(utterance); playButton.textContent = "停止"; status.textContent = "音声を再生中です"; });
document.querySelector("#deliveryTime").addEventListener("change", e => { saveState(); toast(`毎朝 ${e.target.value} に配信する設定です`); });
document.querySelector("#autoCreate").addEventListener("change", () => { saveState(); toast("設定をこの端末に保存しました"); });
document.querySelector("#rssForm").addEventListener("submit", async event => {
  event.preventDefault(); const url = document.querySelector("#rssUrl").value.trim(); if (!url) return toast("RSSのURLを入力してください");
  try {
    const response = await fetch(url); if (!response.ok) throw new Error("RSSを取得できませんでした");
    const xml = new DOMParser().parseFromString(await response.text(), "text/xml"); const items = [...xml.querySelectorAll("item")].slice(0, 10).map(item => ({ category:"RSS", title:item.querySelector("title")?.textContent?.trim() || "無題", summary:(item.querySelector("description")?.textContent || "記事を開いて詳細をご確認ください。").replace(/<[^>]+>/g, "").trim().slice(0, 150), source:xml.querySelector("channel > title")?.textContent?.trim() || "RSS", minutes:"更新済み", selected:true }));
    if (!items.length) throw new Error("記事が見つかりませんでした"); articles.splice(0, articles.length, ...items); saveState(); render(); toast(`${items.length}件のRSS記事を読み込みました`);
  } catch (error) { toast("読み込めませんでした。提供元のCORS設定をご確認ください。"); }
});
document.querySelector("#showPaste").addEventListener("click", () => document.querySelector("#pasteForm").hidden = !document.querySelector("#pasteForm").hidden);
document.querySelector("#pasteForm").addEventListener("submit", event => {
  event.preventDefault(); const titles = document.querySelector("#headlinePaste").value.split("\n").map(value => value.trim()).filter(Boolean).slice(0, 5);
  if (!titles.length) return toast("見出しを1行ずつ貼り付けてください");
  const imported = titles.map((title, index) => ({ category:index < 2 ? "国内経済" : "山口県", title, summary:"SmartNewsで選択した記事です。再生前に記事本文を確認してください。", source:"SmartNews", minutes:"今朝", selected:true }));
  articles.splice(0, articles.length, ...imported); document.querySelector("#headlinePaste").value = ""; document.querySelector("#pasteForm").hidden = true; saveState(); render(); toast(`${imported.length}本を朝のブリーフに追加しました`);
});
const saved = localStorage.getItem("morningBriefArticles"); if (saved) { try { const savedArticles = JSON.parse(saved); if (Array.isArray(savedArticles) && savedArticles.length) articles.splice(0, articles.length, ...savedArticles); } catch {} }
document.querySelector("#deliveryTime").value = localStorage.getItem("morningBriefTime") || "07:00"; document.querySelector("#autoCreate").checked = localStorage.getItem("morningBriefAuto") !== "false";
render();
