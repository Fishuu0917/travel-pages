# 旅途拾頁 Travel, in Pages.

一個可以持續新增內容的旅行筆記網站。以暖白紙張、墨綠與陶土橘呈現旅行編輯誌風格，從行前準備、旅途觀察到旅行回顧，練習把旅程變成自己的記憶。

**專案的核心是 [AGENTS.md](AGENTS.md)**：它定義內容契約、檔名、版型、語氣、驗證與部署流程，讓 AI 不必每次重新猜測網站規則。

目前提供六篇原創編輯示範，並非使用者的親身遊記。你可以把示範換成自己的旅行故事，或依照模板繼續新增。

## 功能

- 首頁卡片、關鍵字搜尋、三個階段的分類，可組合篩選。
- 六篇獨立文章，固定三節與可點擊目錄。
- 收藏文章、練習清單與完成進度，僅儲存在目前瀏覽器 localStorage。
- 響應式排版、鍵盤操作、跳至內容、可見焦點與動態訊息。
- 關於頁展示規則如何對應網站，並提供 AGENTS.md 與 JSON 模板下載。
- GitHub Actions 驗證內容、檢查連結並部署 Pages。

## 本機預覽

需要 Node.js 22 或以上。**沒有第三方套件，不必執行 npm install。**

```sh
npm test
npm run dev
```

瀏覽 [http://127.0.0.1:4173](http://127.0.0.1:4173)。以 Ctrl+C 關閉伺服器。修改內容後，重新執行 `npm run dev` 以重建網站；此預覽伺服器不會自動重建。

只建置：`npm run build`，輸出到 `dist/`。也能以靜態檔案方式託管，不需後端或資料庫。

## 專案結構

```text
AGENTS.md                 AI 必讀規則
content/notes/*.json       文章內容
templates/note.example.json 新文章範本
assets/                   共用 CSS、互動 JS、圖示
scripts/build.mjs         資料驗證與靜態網站產生器
scripts/serve.mjs         本機預覽
tests/site.test.mjs       內容、輸出、連結回歸檢查
.github/workflows/pages.yml 自動檢查與部署
SUBMISSION.md             作業繳交文字
dist/                     建置產物，不提交 Git
```

## 新增一篇文章

1. 閱讀 `AGENTS.md`，複製 `templates/note.example.json`。
2. 存為 `content/notes/<slug>.json`，檔名需與 slug 一致。
3. 填妥標題、摘要、分類、日期、三節內容、練習與相關文章。
4. 更新至少一篇舊文章，使其 `related` 連到新文章。
5. 執行 `npm test`，再以 `npm run dev` 預覽。
6. 提交並推送。首頁、文章、分類與搜尋資料會自動產生，不需要手動修改 HTML。

AI 指令範例：

> 請先閱讀 AGENTS.md，再新增「雨天旅行的備案筆記」，slug 為 rainy-day-plan，分類為行前準備。使用原創示範，補齊三節、練習和相關文章，更新舊文連結並執行檢查。

預期新增 `content/notes/rainy-day-plan.json`，建置後取得 `notes/rainy-day-plan.html`。若格式、日期或相關連結不符合規範，建置會直接報錯。

## GitHub Pages 部署

1. 在自己的 GitHub 建立公開 repository，例如 `travel-pages`，不要預先產生 README。
2. 在本專案資料夾內執行以下指令，將 `YOUR_ACCOUNT` 換成自己的帳號：

```sh
git init -b main
git add .
git commit -m "Create travel notebook and AI collaboration rules"
git remote add origin https://github.com/YOUR_ACCOUNT/travel-pages.git
git push -u origin main
```

3. 進入 repository 的 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**。
4. 開啟 **Actions → Check and deploy travel pages**；若第一次部署因 Pages 未啟用失敗，按 **Run workflow** 重新執行。
5. 兩個工作成功後，以 Pages 設定或部署紀錄顯示的正式網址開啟網站。不要把本機 localhost 網址當作公開成果。

Workflow 使用 `contents: read`；只有部署工作取得 `pages: write` 與 `id-token: write`。PR 僅驗證與建置，不部署。

部署方式參考：[GitHub 官方：以自訂 workflow 部署 Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 原創與隱私

文章、版型與 SVG 插畫為本專案製作。這些方法示範不包含即時景點、票價或營業資訊。加入真實旅遊資訊時，依 AGENTS.md 註明官方來源與確認日期。公開前請移除私人旅程、證件、票券與他人個資。

## 作業繳交

請開啟 [SUBMISSION.md](SUBMISSION.md)，填入自己的身分、實際 repository 與成功部署的網站連結。內容已包含專案簡介，以及規則如何協助 AI 延伸專案的說明。
