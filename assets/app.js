(() => {
  'use strict';
  const storageKey = 'travel-pages:v1:';
  let storageWarned = false;
  function read(key, fallback) {
    try { const value = localStorage.getItem(storageKey+key); return value === null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(storageKey+key,JSON.stringify(value)); return true; }
    catch {
      storageWarned = true;
      notify('瀏覽器無法儲存；本頁仍可操作，重新整理後不會保留。');
      return false;
    }
  }
  let timer;
  function notify(message) {
    const el = document.querySelector('.toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(timer);
    timer = setTimeout(()=>el.classList.remove('visible'),4000);
  }
  const stored = read('saved',[]);
  const saved = new Set(Array.isArray(stored)?stored.filter(s=>typeof s==='string'):[]);
  const library = document.querySelector('[data-library]');
  const cards = [...document.querySelectorAll('[data-note-card]')];
  const search = document.querySelector('#search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const params = new URLSearchParams(location.search);
  let category = filters.some(b=>b.dataset.filter===params.get('category'))?params.get('category'):'all';
  if (search) search.value = params.get('q') || '';
  function filterNotes(updateUrl=false) {
    if (!library) return;
    const query = (search?.value || '').trim().toLocaleLowerCase('zh-TW');
    const terms = query.split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const visible = (category==='all'||card.dataset.category===category) && terms.every(term=>card.dataset.search.includes(term)) && (!library.hasAttribute('data-saved-only')||saved.has(card.dataset.slug));
      card.hidden = !visible;
      if (visible) count++;
    });
    filters.forEach(button=>{const on=button.dataset.filter===category;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});
    document.querySelector('[data-count]').textContent = String(count);
    document.querySelector('[data-empty]').hidden = count>0;
    const status = document.querySelector('[data-result-status]');
    status.textContent = `顯示 ${count} 篇筆記${category==='all'?'':`，分類：${category}`}${query?`，搜尋：${query}`:''}`;
    if (updateUrl) {
      const url = new URL(location.href);
      if (category==='all') url.searchParams.delete('category'); else url.searchParams.set('category',category);
      if (query) url.searchParams.set('q',search.value.trim()); else url.searchParams.delete('q');
      try { history.replaceState(null,'',url); } catch { /* Filtering works without history access. */ }
    }
  }
  function syncSaves() {
    document.querySelectorAll('[data-save]').forEach(button=>{
      const on=saved.has(button.dataset.save);
      button.setAttribute('aria-pressed',String(on));
      const title = button.getAttribute('aria-label').replace(/^(收藏|取消收藏)：/,'');
      button.setAttribute('aria-label',`${on?'取消收藏':'收藏'}：${title}`);
      if(button.classList.contains('save-article')) button.lastChild.textContent=on?' 已收藏這篇筆記':' 收藏這篇筆記';
    });
    filterNotes();
  }
  document.querySelectorAll('[data-save]').forEach(button=>button.addEventListener('click',()=>{
    const slug=button.dataset.save;
    const removing=saved.has(slug);
    if(removing) saved.delete(slug); else saved.add(slug);
    const ok=write('saved',[...saved]);
    syncSaves();
    if(ok) notify(removing?'已從收藏移除':'已收藏，留給下一次出發。');
    if(library?.hasAttribute('data-saved-only')&&removing) {
      const next=cards.find(c=>!c.hidden)?.querySelector('a');
      (next||search)?.focus();
    }
  }));
  filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;filterNotes(true);}));
  search?.addEventListener('input',()=>filterNotes(true));
  document.querySelector('[data-reset]')?.addEventListener('click',()=>{category='all';search.value='';filterNotes(true);search.focus();});
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&search&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable){event.preventDefault();search.focus();}
  });
  syncSaves();
  document.querySelectorAll('[data-exercise]').forEach(exercise=>{
    const key='tasks:'+exercise.dataset.exercise;
    const boxes=[...exercise.querySelectorAll('[data-task]')];
    const data=read(key,[]);
    const checked=new Set(Array.isArray(data)?data.filter(Number.isInteger):[]);
    boxes.forEach((box,i)=>box.checked=checked.has(i));
    function update() {
      const complete=boxes.filter(b=>b.checked).length;
      exercise.querySelector('progress').value=complete;
      exercise.querySelector('[data-progress-text]').textContent=complete===boxes.length?`已完成 ${complete} / ${boxes.length}，把這一頁帶進旅程吧！`:`已完成 ${complete} / ${boxes.length}`;
    }
    boxes.forEach(box=>box.addEventListener('change',()=>{
      write(key,boxes.filter(b=>b.checked).map(b=>Number(b.dataset.task)));
      update();
    }));
    exercise.querySelector('[data-clear-tasks]').addEventListener('click',()=>{
      boxes.forEach(b=>b.checked=false);write(key,[]);update();
      if(!storageWarned)notify('已重設這份練習清單。');
    });
    update();
  });
  window.addEventListener('storage',event=>{
    if(event.key===storageKey+'saved') {
      const latest=read('saved',[]);saved.clear();
      if(Array.isArray(latest)) latest.filter(x=>typeof x==='string').forEach(x=>saved.add(x));
      syncSaves();
    }
  });
})();
