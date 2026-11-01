/* Explicit, browser-local save transfer. The GitHub copy is read-only. */
(function (root) {
  'use strict';
  const KEY = 'shattered.device.campaign.v1';
  const LEGACY = 'https://appventory.github.io/game-previews/shattered/';
  const DEST = 'https://appventory-shattered.web.app';
  const TARGETS = [DEST, 'https://appventory-shattered.firebaseapp.com'];
  const LIMIT = 256 * 1024;
  function decode(raw) {
    if (typeof raw !== 'string' || raw.length > LIMIT) throw Error('Choose a Shattered progress backup.');
    let data = raw;
    for (let i = 0; i < 3 && typeof data === 'string'; i++) data = JSON.parse(data);
    if (!data || Array.isArray(data) || data.version !== 1 || !Number.isInteger(data.highest) || data.highest < 1 || data.highest > 100) throw Error('This backup is not a supported Shattered campaign.');
    for (const [field, max] of [['best',100000], ['stars',3]]) {
      if (!data[field] || Array.isArray(data[field]) || typeof data[field] !== 'object' || Object.keys(data[field]).length > 100 || Object.entries(data[field]).some(([k,v]) => !/^(?:[1-9][0-9]?|100)$/.test(k) || !Number.isInteger(v) || v < 0 || v > max)) throw Error('The campaign scores in this backup are invalid.');
    }
    if (!Array.isArray(data.learned) || data.learned.length > 100 || data.learned.some(x => typeof x !== 'string' || x.length > 100)) throw Error('The tutorial progress in this backup is invalid.');
    for (const field of ['run','practice']) {
      const p = data[field];
      if (p == null) continue;
      if (typeof p !== 'object' || Array.isArray(p) || !Number.isInteger(p.level) || p.level < 1 || p.level > 100 || !Number.isInteger(p.tool) || p.tool < 0 || p.tool > 5 || !Number.isInteger(p.phase) || p.phase < 0 || p.phase > 3 || !Number.isFinite(p.force) || p.force < 0 || p.force > 1 || !Array.isArray(p.placed) || p.placed.length > 100 || p.placed.some(x => !Number.isInteger(x) || x < 0 || x > 99) || (p.seeds != null && (!Array.isArray(p.seeds) || p.seeds.length > 100 || p.seeds.some(x => !Array.isArray(x) || x.length !== 2 || x.some(v => !Number.isFinite(v)))))) throw Error('The unfinished puzzle in this backup is invalid.');
    }
    return data;
  }
  function summary(data) {
    const p = data.replay ? data.practice : data.run;
    return `${Object.keys(data.best).length} completed levels · ${Object.values(data.stars).reduce((a,b)=>a+b,0)} stars${p ? ` · level ${p.level}${p.phase === 1 ? `, ${p.placed.length} of ${p.seeds?.length || '?'} pieces placed` : ''}` : ''}`;
  }
  if (typeof module === 'object' && module.exports) { module.exports = {decode, summary, KEY}; return; }
  function read() { return localStorage.getItem(KEY); }
  function download(raw, name = 'shattered-progress.json') {
    decode(raw);
    const url = URL.createObjectURL(new Blob([raw], {type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function element(tag, text, parent, cls) {
    const e = document.createElement(tag); if (text) e.textContent=text; if (cls) e.className=cls; if(parent)parent.append(e); return e;
  }
  function style() {
    if(document.getElementById('transfer-style'))return;
    const s=element('style',null,document.head);s.id='transfer-style';
    s.textContent='html,body{margin:0;min-height:100%;background:#101f24;color:#e8f5f0;font:16px/1.5 system-ui,sans-serif}*{box-sizing:border-box}.transfer-screen{position:fixed;inset:0;z-index:2147483647;background:#101f24;overflow:auto;overscroll-behavior:contain;padding:24px 18px max(24px,env(safe-area-inset-bottom))}.transfer-card{max-width:540px;margin:0 auto}.transfer-card h1{font-size:30px;line-height:1.1;margin:12px 0 20px}.transfer-card p{color:#c3d9d3}.transfer-card button,.transfer-card a{display:block;width:100%;padding:13px 16px;margin:12px 0;border:1px solid #52736d;border-radius:16px;background:#193832;color:#e8f5f0;font:700 16px/1.4 system-ui;text-align:center;text-decoration:none;cursor:pointer}.transfer-card button.primary{background:#8ae0cb;color:#102329;border-color:#8ae0cb}.transfer-card button:disabled{opacity:.5;cursor:default}.transfer-card iframe{width:100%;height:270px;border:1px solid #52736d;border-radius:16px;background:#101f24}.transfer-card input{width:100%;padding:12px 0;color:#e8f5f0}.transfer-status{padding:12px;background:#193832;border-radius:12px;overflow-wrap:anywhere}.transfer-card small{display:block;color:#adc7bf}.transfer-card [hidden]{display:none!important}';
  }
  function screen(title) {
    style(); const outer=element('section',null,document.body,'transfer-screen'); outer.setAttribute('aria-label','Saved progress');
    const card=element('main',null,outer,'transfer-card'); element('small','SHATTERED',card);element('h1',title,card);
    return {outer,card};
  }
  function legacyPage() {
    const {card}=screen('Keep your progress');
    element('p','Your GitHub game stays available. Copy its saved campaign to Shattered’s new Firebase home, or download a backup. This page never changes the old save.',card);
    const status=element('p','Checking this browser…',card,'transfer-status');status.setAttribute('role','status');
    let raw;try{raw=read();status.textContent=raw?summary(decode(raw)):'No saved campaign found in this browser context.';}catch(e){status.textContent='This browser cannot read a supported saved campaign here.';}
    const send=element('button','Copy this progress',card,'primary');send.disabled=!raw;
    const embedded=root.parent!==root && TARGETS.includes(new URL(document.referrer || LEGACY).origin);
    send.hidden=!embedded;
    send.onclick=()=>{try{raw=read();decode(raw);root.parent.postMessage({type:'shattered-save-v1',raw},new URL(document.referrer).origin);status.textContent='Copy ready. Confirm it in the new game.';}catch(e){status.textContent=e.message;}};
    const exportButton=element('button','Download progress backup',card);exportButton.disabled=!raw;exportButton.onclick=()=>{try{download(read());}catch(e){status.textContent=e.message;}};
    if(!embedded){const a=element('a','Open the new game and import',card);a.href=DEST+'/?progress=1';const old=element('a','Keep playing the GitHub version',card);old.href=LEGACY;}
    element('small','If the old game was played inside Play, open the transfer from that same Play entry. Browser storage can differ between standalone and embedded play.',card);
  }
  function destination({launch,standalone=false}) {
    return new Promise(resolve=>{
      const {outer,card}=screen('Your saved game');
      element('p','Played the GitHub version? Bring your campaign here before continuing. Your old saved game stays untouched.',card);
      const status=element('p','Copy from the old version or choose a progress backup.',card,'transfer-status');status.setAttribute('role','status');
      let candidate=null,sourceFrame=null;
      const use=element('button','Use this saved game',card,'primary');use.hidden=true;
      function show(raw){const data=decode(raw);candidate=raw;status.textContent=summary(data);use.hidden=false;}
      const pull=element('button','Find progress in the old version',card,'primary');
      pull.onclick=()=>{if(sourceFrame)return;sourceFrame=element('iframe',null,card);sourceFrame.title='Old Shattered saved progress';sourceFrame.referrerPolicy='strict-origin';sourceFrame.src=LEGACY+'progress.html';element('small','If no save is found, use a backup exported from the browser and Play context where you played before.',card);};
      const fileLabel=element('label','Or import a downloaded backup',card);const file=element('input',null,fileLabel);file.type='file';file.accept='.json,application/json';
      file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>LIMIT)throw Error('This file is too large for a Shattered save.');show(await f.text());}catch(e){candidate=null;use.hidden=true;status.textContent=e.message;}};
      const receive=e=>{if(!sourceFrame || e.origin!=='https://appventory.github.io' || e.source!==sourceFrame.contentWindow || e.data?.type!=='shattered-save-v1')return;try{show(e.data.raw);}catch(err){status.textContent=err.message;}};
      root.addEventListener('message',receive);
      function done(){root.removeEventListener('message',receive);outer.remove();resolve();if(standalone)location.href='./';}
      use.onclick=()=>{try{
        decode(candidate); const previous=read();
        if(previous && previous!==candidate){
          if(!root.confirm('Replace the saved campaign at this Firebase address? Its current save will also be kept as a local backup. The GitHub save stays unchanged.'))return;
          localStorage.setItem('shattered.migration.backup.v1',previous);
        }
        localStorage.setItem(KEY,candidate);
        if(read()!==candidate)throw Error('The browser did not retain the imported save.');
        localStorage.setItem('shattered.migration.choice.v1','copied');done();
      }catch(e){status.textContent='Progress was not imported: '+e.message;}};
      const play=element('button',read()?'Continue with progress already here':'Play here without importing',card);play.onclick=()=>{try{localStorage.setItem('shattered.migration.choice.v1','continue');done();}catch(e){status.textContent='Browser storage is unavailable. Your old game is still available.';}};
      const current=read();if(current){const backup=element('button','Download the progress already here',card);backup.onclick=()=>{try{download(current);}catch(e){status.textContent=e.message;}};}
      const old=element('a','Open the old game',card);old.href=LEGACY;old.target='_blank';old.rel='noopener';
      element('small','Progress is stored on this device and browser. Importing copies the complete campaign, settings and unfinished puzzle. It is not continuous cloud sync.',card);
    });
  }
  root.ShatteredTransfer={async beforeStart(){
    if(!TARGETS.includes(location.origin))return;
    let exists=false,chosen=false;try{exists=!!read();chosen=!!localStorage.getItem('shattered.migration.choice.v1');}catch{return;}
    if(!exists&&!chosen || new URLSearchParams(location.search).get('progress')==='1')await destination({launch:true});
  }};
  if(location.pathname.endsWith('/progress.html')){
    const ready=()=>{if(location.origin==='https://appventory.github.io')legacyPage();else if(TARGETS.includes(location.origin))destination({standalone:true});};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  }
})(globalThis);
