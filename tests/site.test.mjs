import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { build, root, loadNotes, validateNotes, escapeHtml } from '../scripts/build.mjs';

const notes = await loadNotes();
const output = path.join(root,'dist');
await build(output);

test('內容資料符合契約，包含三個旅程分類與入站相關連結',()=>{
  assert.ok(notes.length>=1);
  assert.equal(new Set(notes.map(n=>n.category)).size,3);
  assert.equal(validateNotes(notes),notes);
});

test('拒絕失效的關聯、未來日期、錯誤章節及危險來源 URL',()=>{
  for(const mutate of [
    list=>list[0].related=['missing-note'],
    list=>list[0].date='2999-01-01',
    list=>list[0].date='2026-02-30',
    list=>list[0].sections[0].heading='錯誤章節',
    list=>list[0].sources=[{label:'bad',url:'javascript:alert(1)',checked:'2026-11-10'}]
  ]){const copy=structuredClone(notes);mutate(copy);assert.throws(()=>validateNotes(copy));}
});

test('使用者文字中的 HTML 與引號會跳脫',()=>{
  assert.equal(escapeHtml('<script a="x">&\'hi\'</script>'),'&lt;script a=&quot;x&quot;&gt;&amp;&#39;hi&#39;&lt;/script&gt;');
});

async function htmlFiles(dir) {
  const files=[];
  for(const item of await readdir(dir,{withFileTypes:true})) {
    if(item.isDirectory())files.push(...await htmlFiles(path.join(dir,item.name)));
    else if(item.name.endsWith('.html'))files.push(path.join(dir,item.name));
  }
  return files;
}
test('所有頁面的站內連結、資產與錨點在 repository 子路徑下有效',async()=>{
  const files=await htmlFiles(output);
  assert.equal(files.length,notes.length+3);
  for(const file of files) {
    const html=await readFile(file,'utf8');
    assert.match(html,/<html lang="zh-Hant">/);
    assert.match(html,/<main id="main">/);
    for(const [,raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if(raw.startsWith('https:'))continue;
      assert.ok(!raw.startsWith('/'),`${file}: 絕對路徑 ${raw}`);
      const url=new URL(raw,'https://example.test/travel-pages/'+path.relative(output,file).split(path.sep).join('/'));
      const target=path.join(output,decodeURIComponent(url.pathname.replace('/travel-pages/','')));
      assert.ok((await stat(target)).isFile(),`${file}: ${raw} 不存在`);
      if(url.hash && target.endsWith('.html')) {
        const targetHtml=target===file?html:await readFile(target,'utf8');
        assert.ok(targetHtml.includes(`id="${url.hash.slice(1)}"`),`${file}: 錨點 ${raw} 不存在`);
      }
    }
  }
});

test('每篇文章都有可勾選練習、相關文章及正確示範標籤',async()=>{
  for(const note of notes) {
    const html=await readFile(path.join(output,'notes',note.slug+'.html'),'utf8');
    assert.equal([...html.matchAll(/data-task="/g)].length,note.exercise.items.length);
    assert.match(html,/<progress /);
    if(note.kind==='demo')assert.ok(html.includes('編輯示範 · 非親身遊記'));
    for(const slug of note.related)assert.ok(html.includes(`../notes/${slug}.html`));
  }
});

test('規則與模板可透過網站直接取得',async()=>{
  assert.equal(await readFile(path.join(output,'AGENTS.md'),'utf8'),await readFile(path.join(root,'AGENTS.md'),'utf8'));
  assert.deepEqual(JSON.parse(await readFile(path.join(output,'templates/note.example.json'),'utf8')),JSON.parse(await readFile(path.join(root,'templates/note.example.json'),'utf8')));
});
