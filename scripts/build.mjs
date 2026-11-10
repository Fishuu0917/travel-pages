import { readFile, readdir, mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const categories = ['行前準備', '旅途觀察', '旅行回顧'];
const headings = ['行前準備', '旅途中觀察', '回來後整理'];
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const e = escapeHtml;
const icons = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/>',
  bag: '<rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M9 11v6m6-6v6"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  leaf: '<path d="M20 4C8 1 1 9 7 16s16 1 13-12ZM5 20 16 9"/>',
  camera: '<path d="M4 6h4l2-3h4l2 3h4v15H4Z"/><circle cx="12" cy="13" r="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>'
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;

function requireThat(condition, message) { if (!condition) throw new Error(message); }
const text = (v, min=1, max=3000) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const textList = (v, min=1, max=10) => Array.isArray(v) && v.length >= min && v.length <= max && v.every(x => text(x));
function validDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().startsWith(v) && v <= new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
}

export function validateNotes(notes, filenames = notes.map(n => `${n.slug}.json`)) {
  requireThat(notes.length > 0, '至少需要一篇筆記');
  const slugs = new Set();
  for (const [i, n] of notes.entries()) {
    const prefix = filenames[i];
    const assert = (ok, msg) => requireThat(ok, `${prefix}: ${msg}`);
    assert(typeof n.slug === 'string' && /^[a-z]+(?:-[a-z]+)*$/.test(n.slug), 'slug 需為小寫英文與連字號');
    assert(filenames[i] === `${n.slug}.json`, '檔名必須等於 slug.json');
    assert(!slugs.has(n.slug), 'slug 重複'); slugs.add(n.slug);
    assert(text(n.title, 6, 32), 'title 長度需為 6–32');
    assert(text(n.summary, 20, 110), 'summary 長度需為 20–110');
    assert(categories.includes(n.category), 'category 不在允許清單');
    assert(text(n.location,1,50), 'location 不可為空');
    assert(validDate(n.date), 'date 需為有效且非未來的 YYYY-MM-DD');
    assert(Number.isInteger(n.minutes) && n.minutes >= 1 && n.minutes <= 30, 'minutes 需為 1–30 整數');
    assert(['demo','personal'].includes(n.kind), 'kind 必須是 demo 或 personal');
    assert(textList(n.tags,2,4) && new Set(n.tags).size === n.tags.length, 'tags 需為 2–4 個不重複字串');
    assert(text(n.intro), 'intro 不可為空');
    assert(Array.isArray(n.sections) && n.sections.length === 3, '必須有三個 sections');
    n.sections.forEach((s,j) => assert(s.heading === headings[j] && textList(s.body) && textList(s.tips), `第 ${j+1} 節格式錯誤`));
    assert(n.exercise && text(n.exercise.title) && textList(n.exercise.items,3,6), 'exercise 需含 title 與 3–6 個步驟');
    assert(textList(n.related,1,3) && new Set(n.related).size === n.related.length, 'related 需為 1–3 個不重複 slug');
    assert(Array.isArray(n.sources), 'sources 必須是陣列');
    n.sources.forEach(s => {
      let url; try { url = new URL(s.url); } catch { /* validated below */ }
      assert(text(s.label) && url?.protocol === 'https:' && !url.username && !url.password && validDate(s.checked), 'source 需有 label、HTTPS url 與 checked 日期');
    });
  }
  for (const n of notes) for (const slug of n.related) requireThat(slugs.has(slug) && slug !== n.slug, `${n.slug}: 無效 related ${slug}`);
  for (const n of notes) requireThat(notes.some(other => other.related.includes(n.slug)), `${n.slug}: 至少需要一篇舊文連到這篇文章`);
  return notes;
}

export async function loadNotes() {
  const files = (await readdir(path.join(root,'content/notes'))).filter(f => f.endsWith('.json')).sort();
  return validateNotes(await Promise.all(files.map(async f => JSON.parse(await readFile(path.join(root,'content/notes',f),'utf8')))), files);
}

function shell({title, description, content, active='all', base='./', bodyClass=''}) {
  const nav = (id, label, name, href) => `<a class="nav-item ${active===id?'active':''}" href="${base}${href}" aria-label="${label}" ${active===id?'aria-current="page"':''}>${icon(name)}<span>${label}</span>${active===id?'<span class="nav-dot"></span>':''}</a>`;
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#253f36"><meta name="description" content="${e(description)}"><title>${e(title)} · 旅途拾頁</title><link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}assets/styles.css"><script src="${base}assets/app.js" defer></script></head>
<body class="${bodyClass}"><a class="skip-link" href="#main">跳至主要內容</a><aside class="sidebar"><a class="brand" href="${base}index.html" aria-label="旅途拾頁首頁"><span class="brand-mark">${icon('compass')}</span><span>旅途拾頁<small>TRAVEL, IN PAGES.</small></span></a><p class="sidebar-caption">把每一次出發，好好收藏。</p><p class="nav-label">我的旅行書架</p><nav aria-label="主要導覽">${nav('all','所有筆記','book','index.html')}${nav('saved','我的收藏','bookmark','saved.html')}<div class="nav-divider"></div><span class="nav-label">依旅程翻閱</span>${categories.map((c,i)=>nav(`cat${i}`,c,['bag','pin','leaf'][i],`index.html?category=${encodeURIComponent(c)}#library`)).join('')}<div class="nav-divider"></div>${nav('guide','關於這本筆記','compass','guide.html')}</nav><div class="sidebar-note"><span class="tiny-star">✳</span><p>旅程會結束，<br>故事可以繼續。</p><span>一頁一頁，累積自己的旅行。</span></div><div class="sidebar-footer">A LITTLE FURTHER, A LITTLE SLOWER.</div></aside>
<div class="workspace"><header class="topbar"><span class="breadcrumb">旅行書架 <span>/</span> <strong>${active==='saved'?'我的收藏':active==='guide'?'關於這本筆記':bodyClass==='article-page'?'旅行筆記':'所有筆記'}</strong></span><a class="top-link" href="${base}guide.html#writing">一起寫下一頁 ${icon('arrow')}</a></header><main id="main">${content}</main><footer class="site-footer"><a href="${base}index.html">旅途拾頁 <span>TRAVEL, IN PAGES.</span></a><span>原創編輯示範 · 為下一次出發，留一頁空白。</span><a href="${base}AGENTS.md">閱讀 AGENTS.md ${icon('arrow')}</a></footer></div><div class="toast" role="status" aria-live="polite"></div></body></html>`;
}

function illustration() {
  return `<svg class="hero-art" viewBox="0 0 470 330" fill="none" aria-hidden="true"><circle cx="253" cy="150" r="119" fill="#e7dfcb"/><path d="M46 266c42-10 56-4 79 10m231-200 39 3m-2-12 3 25" stroke="#a9b49c" stroke-width="1.5"/><path d="M63 123c13-24 46-27 48-6 4 26-56 14-41 49 11 26 43 4 52 28" stroke="#a6b6a0" stroke-width="2" stroke-dasharray="5 6"/><g transform="rotate(-12 190 172)"><rect x="103" y="65" width="174" height="219" rx="5" fill="#c8be9e"/><rect x="108" y="59" width="174" height="219" rx="4" fill="#fcfaf1" stroke="#d3c9b2"/><path d="M119 66v202" stroke="#d5c9b3"/><rect x="132" y="83" width="128" height="110" fill="#adc0ad"/><path d="m132 171 41-51 36 37 28-26 23 40v22H132Z" fill="#6f8c78"/><path d="m171 120 13 14-9-3-5 7-6-8Z" fill="#f8f4e8"/><circle cx="233" cy="105" r="12" fill="#ead8a9"/><path d="M140 213h110m-110 13h90m-90 13h70" stroke="#b9b4a2" stroke-width="2"/><text x="146" y="260" font-family="Georgia,serif" font-size="11" fill="#78816d" letter-spacing="3">COLLECT MOMENTS</text></g><g transform="rotate(13 312 226)"><rect x="254" y="172" width="130" height="98" rx="3" fill="#faf7ed" stroke="#d3c9b2"/><rect x="265" y="182" width="108" height="66" fill="#d2b48f"/><path d="M265 220c35-16 65 23 108-4v32H265" fill="#8f9f8b"/><path d="M265 232c32-9 61 13 108-4v20H265" fill="#5d7b68"/><circle cx="349" cy="200" r="8" fill="#f5e4b9"/></g><path d="m332 61 14-27 12 34-12-6-9 7Z" fill="#a74729"/><path d="m339 61 7-27" stroke="#fcfaf1"/><path d="M385 130c11-4 21-1 28 8-12 5-23 3-28-8Zm-4-13c-7-8-6-17-1-25 9 8 10 17 1 25Zm2 9v46" stroke="#657e65" stroke-width="2"/><circle cx="85" cy="231" r="16" stroke="#a74729" opacity=".6"/><path d="m79 231 4 4 8-8" stroke="#a74729" stroke-width="2"/><path d="m315 300 2-7m-7 4 7 3" stroke="#a74729" stroke-width="2"/></svg>`;
}
const themes = ['bag','map','leaf','camera','compass','book'];
const themeIndex = slug => ['packing-light','slow-route','five-senses','photo-story','memory-map','travel-review'].indexOf(slug);
function card(n, index=0, base='./') {
  const i = themeIndex(n.slug) < 0 ? categories.indexOf(n.category) : themeIndex(n.slug);
  return `<article class="note-card" data-note-card data-slug="${e(n.slug)}" data-category="${e(n.category)}" data-search="${e([n.title,n.summary,n.category,...n.tags].join(' ').toLowerCase())}"><div class="card-top"><span class="card-symbol tone-${i%3}">${icon(themes[i%6])}</span><span class="card-category">${e(n.category)}</span><button type="button" class="bookmark-button" data-save="${e(n.slug)}" aria-label="收藏：${e(n.title)}" aria-pressed="false">${icon('bookmark')}</button></div><a class="card-main" href="${base}notes/${n.slug}.html"><span class="card-kicker">NOTE ${String(index+1).padStart(2,'0')} <span>／</span> ${n.kind==='demo'?'編輯示範':'旅行實記'}</span><h3>${e(n.title)}</h3><p>${e(n.summary)}</p></a><div class="card-tags">${n.tags.map(t=>`<span># ${e(t)}</span>`).join('')}</div><div class="card-bottom"><span>${icon('clock')} ${n.minutes} 分鐘閱讀</span><a href="${base}notes/${n.slug}.html" aria-label="閱讀：${e(n.title)}">翻開這一頁 ${icon('arrow')}</a></div></article>`;
}

function library(notes, saved=false) {
  const total = notes.length;
  const hero = saved ? `<section class="saved-hero"><p class="eyebrow">YOUR LITTLE COLLECTION</p><h1>留給下一次出發的靈感。</h1><p>把喜歡的頁面收在這裡，想出發的時候再慢慢翻閱。</p><div class="local-note">${icon('bookmark')} 收藏儲存在這個瀏覽器，不會跨裝置同步。</div></section>` : `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span></span> A NOTEBOOK FOR EVERY JOURNEY</p><h1>把風景收進眼裡，<br>把旅程留在<span>紙上。</span></h1><p class="hero-description">出發前的期待、路上的小發現、回家後的餘韻。<br class="desktop-br">用一頁筆記，收藏每一次旅行的樣子。</p><a class="primary-link" href="#library">開始翻閱 ${icon('arrow')}</a><div class="hero-meta"><span>${total} <small>篇旅行筆記</small></span><i></i><span>3 <small>個旅程階段</small></span><i></i><span>∞ <small>種新的可能</small></span></div></div>${illustration()}<span class="hero-coordinate">TAKE MEMORIES. LEAVE SOME SPACE.</span></section><section class="featured-strip"><div class="featured-label">${icon('sun')} 本次選讀</div><a href="./notes/slow-route.html"><span>不用把行程填滿，<strong>一天只留三個停靠點</strong></span><span class="featured-action">給喜歡慢一點的你 ${icon('arrow')}</span></a></section>`;
  return shell({title:saved?'我的收藏':'把旅程留在紙上',description:'旅途拾頁是可持續擴充的旅行筆記網站，從行前準備、旅途觀察到旅行回顧，用一頁筆記收藏旅程。',active:saved?'saved':'all',content:`${hero}<section class="library" id="library" data-library ${saved?'data-saved-only':''}><div class="section-heading"><div><p class="eyebrow">${saved?'SAVED FOR LATER':'THE TRAVEL LIBRARY'}</p><h2>${saved?'我的收藏':'翻開你的下一頁'}<span class="count-badge" data-count>${total}</span></h2></div><label class="search-field">${icon('search')}<input type="search" id="search" placeholder="搜尋筆記、關鍵字…" aria-label="搜尋筆記或關鍵字" autocomplete="off"><kbd>/</kbd></label></div><div class="filter-row"><div class="filters" role="group" aria-label="依階段篩選"><button type="button" data-filter="all" class="selected" aria-pressed="true">所有筆記 <span>${total}</span></button>${categories.map(c=>`<button type="button" data-filter="${c}" aria-pressed="false">${c}</button>`).join('')}</div><span class="filter-caption">一段旅程，三種記錄方式</span></div><p class="result-status sr-only" aria-live="polite" data-result-status></p><div class="note-grid">${notes.map((n,i)=>card(n,i)).join('')}</div><div class="empty-state" data-empty hidden>${icon('compass')}<h3>${saved?'還沒有收藏的筆記':'這一頁，還是空白的。'}</h3><p>${saved?'按下文章卡片的書籤，就能把喜歡的筆記留在這裡。':'試試其他關鍵字，或切換到所有筆記。'}</p><button type="button" data-reset>清除搜尋與篩選</button>${saved?'<a href="./index.html#library">去翻閱所有筆記 →</a>':''}</div></section><section class="closing-note"><span class="closing-icon">${icon('leaf')}</span><div><h2>好的旅行筆記，從一個小觀察開始。</h2><p>不必去得很遠，也不必寫得很多。下一頁，就從今天開始。</p></div><a href="./guide.html#writing">看看這本筆記怎麼長大 ${icon('arrow')}</a></section>`});
}

function article(n, notes) {
  const index = notes.findIndex(x => x.slug===n.slug);
  const content = `<div class="article-wrap"><a class="back-link" href="../index.html#library">← 回到所有筆記</a><header class="article-header"><p class="eyebrow">NOTE ${String(index+1).padStart(2,'0')} / ${e(n.category)}</p><h1>${e(n.title)}</h1><p class="article-summary">${e(n.summary)}</p><div class="article-meta"><span>${icon('pin')} ${e(n.location)}</span><span>${icon('clock')} ${n.minutes} 分鐘閱讀</span><time datetime="${n.date}">${n.date.replaceAll('-',' / ')}</time></div><div class="article-tags">${n.tags.map(t=>`<span># ${e(t)}</span>`).join('')}<span class="demo-label">${n.kind==='demo'?'編輯示範 · 非親身遊記':'使用者提供的旅行實記'}</span></div></header><div class="article-layout"><div class="article-body"><p class="article-intro">${e(n.intro)}</p>${n.sections.map((s,i)=>`<section class="prose-section" id="step-${i+1}"><span class="step-number">0${i+1}</span><h2>${e(s.heading)}</h2>${s.body.map(p=>`<p>${e(p)}</p>`).join('')}<ul>${s.tips.map(t=>`<li>${e(t)}</li>`).join('')}</ul></section>`).join('')}<section class="exercise" id="exercise" data-exercise="${e(n.slug)}"><p class="eyebrow">A LITTLE PRACTICE</p><h2>${e(n.exercise.title)}</h2><p>把靈感變成一個小行動，完成後替自己打個勾。</p><div class="progress-heading"><span data-progress-text aria-live="polite">已完成 0 / ${n.exercise.items.length}</span><span>僅儲存在這個瀏覽器</span></div><progress value="0" max="${n.exercise.items.length}" aria-label="練習完成進度"></progress><div class="checklist">${n.exercise.items.map((t,i)=>`<label><input type="checkbox" data-task="${i}"><span>${e(t)}</span></label>`).join('')}</div><button type="button" class="text-button" data-clear-tasks>重設這份清單</button></section>${n.sources.length?`<section class="sources"><h2>參考來源</h2><ul>${n.sources.map(s=>`<li><a href="${e(s.url)}" rel="noopener noreferrer">${e(s.label)}</a> · 確認日期 ${s.checked}</li>`).join('')}</ul></section>`:'<p class="source-note">這篇是原創的筆記方法示範，沒有引用特定景點或即時旅遊資訊。</p>'}</div><aside class="article-toc"><p class="eyebrow">ON THIS PAGE</p><strong>這一頁的路線</strong><nav aria-label="文章目錄">${n.sections.map((s,i)=>`<a href="#step-${i+1}"><span>0${i+1}</span>${e(s.heading)}</a>`).join('')}<a href="#exercise"><span>✳</span>動手寫一頁</a></nav><button class="save-article" type="button" data-save="${e(n.slug)}" aria-label="收藏：${e(n.title)}" aria-pressed="false">${icon('bookmark')} 收藏這篇筆記</button><p>喜歡的片刻，<br>值得慢慢保存。</p></aside></div><section class="related-notes"><p class="eyebrow">KEEP WANDERING</p><h2>沿著這一頁，繼續走走。</h2><div class="note-grid">${n.related.map(slug => {const other=notes.find(x=>x.slug===slug);return card(other, notes.indexOf(other), '../');}).join('')}</div></section></div>`;
  return shell({title:n.title,description:n.summary,base:'../',content,bodyClass:'article-page'});
}

function guide(agents, count) {
  return shell({title:'關於這本筆記',description:'了解旅途拾頁的內容格式、設計規則與 AI 協作方式，依照 AGENTS.md 持續新增旅行筆記。',active:'guide',content:`<article class="guide-wrap"><p class="eyebrow">A NOTEBOOK THAT KEEPS GROWING</p><h1>一本會繼續長大的<br>旅行筆記。</h1><p class="guide-lead">風景每次不同，記錄的習慣可以延續。<br>旅途拾頁，把一次性的網頁變成可以持續書寫的內容系統。</p><div class="guide-three">${categories.map((c,i)=>`<section><span>0${i+1}</span>${icon(['bag','pin','leaf'][i])}<h2>${c}</h2><p>${['替期待找到方向，也替行程留一點空白。','帶著自己的眼睛，收集只有你會注意的細節。','把片刻整理成記憶，留給下一次出發。'][i]}</p></section>`).join('')}</div><section class="guide-section"><h2>這裡的內容從哪裡來？</h2><p>目前的 ${count} 篇文章是為本專案撰寫的原創編輯示範，提供旅行筆記的方法與練習，並非站主的親身遊記。未來可以沿用相同格式，換成自己的旅行素材。</p><p>這個網站沒有訂票或即時旅遊查詢功能。收藏與練習清單儲存在你使用的瀏覽器；清除瀏覽資料後，這些紀錄也會消失。</p></section><section class="guide-section" id="writing"><p class="eyebrow">ONE FILE, ONE NEW PAGE</p><h2>下一篇，怎麼繼續寫？</h2><p>給 AI 一份明確的規則，比每次重新描述整個網站更容易延續一致的樣子。本站以 <a href="./AGENTS.md">AGENTS.md</a> 定義檔案位置、文章欄位、視覺風格與驗收方式。</p><ol class="writing-steps"><li><strong>複製內容模板</strong><p>從 <a href="./templates/note.example.json">note.example.json</a> 複製一份到 content/notes/，使用英文連字號命名。</p></li><li><strong>沿用三段式筆記</strong><p>填入行前準備、旅途中觀察、回來後整理，附上可勾選的練習與相關文章。</p></li><li><strong>檢查，再發佈</strong><p>執行 npm test。通過後推送到 main，GitHub Actions 會建置文章與首頁，並部署 Pages。</p></li></ol><div class="prompt-box"><span>可以這樣請 AI 幫忙</span><p>請先閱讀 AGENTS.md，再新增「雨天旅行的備案筆記」，slug 為 rainy-day-plan，分類為行前準備。使用原創示範，補齊三節、練習和相關文章，更新舊文連結並執行檢查。</p></div></section><section class="guide-section"><h2>讓規則與成果互相對應</h2><div class="rule-table"><table><thead><tr><th>文件裡的規則</th><th>網站上的結果</th></tr></thead><tbody><tr><td>一篇文章一個 JSON</td><td>自動建立獨立頁面、卡片與搜尋索引</td></tr><tr><td>固定三個內容章節</td><td>每篇有一致的閱讀節奏與側邊目錄</td></tr><tr><td>每篇附實作步驟</td><td>可勾選清單與完成進度</td></tr><tr><td>相對路徑與共享版型</td><td>可部署於 GitHub Pages 子目錄並一致擴充</td></tr></tbody></table></div></section><section class="guide-section"><h2>完整 AI 協作規則</h2><p><a href="./AGENTS.md" download>下載 AGENTS.md ↗</a> · <a href="./templates/note.example.json" download>下載文章模板 ↗</a></p><details class="rules-details"><summary>展開閱讀 AGENTS.md</summary><pre>${e(agents)}</pre></details></section></article>`});
}

export async function build(output = path.join(root,'dist')) {
  const notes = await loadNotes();
  // Keep a predictable, editable editorial order. New notes follow by date and slug.
  const order = ['packing-light','slow-route','five-senses','photo-story','memory-map','travel-review'];
  notes.sort((a,b)=>(order.indexOf(a.slug)<0?999:order.indexOf(a.slug))-(order.indexOf(b.slug)<0?999:order.indexOf(b.slug)) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  await mkdir(path.join(output,'notes'), {recursive:true});
  // Remove only stale generated article files inside the selected output/notes directory.
  const { unlink } = await import('node:fs/promises');
  for (const f of await readdir(path.join(output,'notes'))) if (f.endsWith('.html') && !notes.some(n=>`${n.slug}.html`===f)) await unlink(path.join(output,'notes',f));
  await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
  await mkdir(path.join(output,'templates'),{recursive:true});
  const agents = await readFile(path.join(root,'AGENTS.md'),'utf8');
  await Promise.all([
    writeFile(path.join(output,'index.html'),library(notes)),
    writeFile(path.join(output,'saved.html'),library(notes,true)),
    writeFile(path.join(output,'guide.html'),guide(agents, notes.length)),
    writeFile(path.join(output,'AGENTS.md'),agents),
    writeFile(path.join(output,'.nojekyll'),''),
    cp(path.join(root,'templates/note.example.json'),path.join(output,'templates/note.example.json')),
    ...notes.map(n=>writeFile(path.join(output,'notes',`${n.slug}.html`),article(n,notes)))
  ]);
  return {count:notes.length, output};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await build();
  console.log(`已驗證 ${result.count} 篇筆記，產生 ${result.count+3} 個頁面 → ${result.output}`);
}
