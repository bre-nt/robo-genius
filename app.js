/* app.js - shared logic for all pages
   Stores everything in localStorage; no server required.
*/
const KEYS = {
  USERS: 'rg_users_v2',
  POSTS: 'rg_posts_v2',
  STORIES: 'rg_stories_v2',
  ROOMS: 'rg_rooms_v2',
  DMS: 'rg_dms_v2',
  LESSONS: 'rg_lessons_v2',
  ACTIVE: 'rg_active_v2',
  NOTIFS: 'rg_notifs_v2'
};

let db = {
  users: JSON.parse(localStorage.getItem(KEYS.USERS) || '{}'),
  posts: JSON.parse(localStorage.getItem(KEYS.POSTS) || '[]'),
  stories: JSON.parse(localStorage.getItem(KEYS.STORIES) || '[]'),
  rooms: JSON.parse(localStorage.getItem(KEYS.ROOMS) || '[]'),
  dms: JSON.parse(localStorage.getItem(KEYS.DMS) || '[]'),
  lessons: JSON.parse(localStorage.getItem(KEYS.LESSONS) || '{}'),
  notifs: JSON.parse(localStorage.getItem(KEYS.NOTIFS) || '[]')
};

let ACTIVE = localStorage.getItem(KEYS.ACTIVE) || null;

function saveDB(){
  localStorage.setItem(KEYS.USERS, JSON.stringify(db.users));
  localStorage.setItem(KEYS.POSTS, JSON.stringify(db.posts));
  localStorage.setItem(KEYS.STORIES, JSON.stringify(db.stories));
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(db.rooms));
  localStorage.setItem(KEYS.DMS, JSON.stringify(db.dms));
  localStorage.setItem(KEYS.LESSONS, JSON.stringify(db.lessons));
  localStorage.setItem(KEYS.NOTIFS, JSON.stringify(db.notifs));
}

function uid(prefix='id'){return prefix + Math.random().toString(36).substr(2,9);}
function timeAgo(ts){ let s=Math.floor((Date.now()-ts)/1000); if(s<60) return s+'s'; if(s<3600) return Math.floor(s/60)+'m'; if(s<86400) return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; }
function grav(name){ return (name||'G')[0].toUpperCase(); }
function toast(m){ try{ if(window.toastr) toastr.info(m); else alert(m);}catch(e){alert(m);} }

/* ========== AUTH ========== */
function register(username,password){
  username = username.trim();
  if(!username || !password) return toast('Enter username & password');
  if(db.users[username]) return toast('User exists');
  db.users[username] = {user:username,pass:password,bio:'',avatar:null,followers:[],following:[],posts:[]};
  ACTIVE = username; localStorage.setItem(KEYS.ACTIVE,username); saveDB(); toast('Registered & logged in');
  updateUI();
}
function login(username,password){
  if(db.users[username] && db.users[username].pass === password){
    ACTIVE = username; localStorage.setItem(KEYS.ACTIVE,username); toast('Logged in as ' + username); updateUI();
  } else toast('Wrong login');
}
function logout(){ ACTIVE = null; localStorage.removeItem(KEYS.ACTIVE); updateUI(); }

/* ========== PROFILE ========== */
function getActive(){ return ACTIVE; }
function getUser(u){ return db.users[u]||null; }

function saveProfile({name, bio, avatarData}){
  if(!ACTIVE) return toast('Login first');
  const u = db.users[ACTIVE];
  if(name) u.user = name;
  if(bio!==undefined) u.bio = bio;
  if(avatarData) u.avatar = avatarData;
  db.users[ACTIVE] = u; saveDB(); updateUI(); toast('Profile saved');
}

/* ========== POSTS & FEED ========== */
function createPost(text, file){
  if(!text && !file) return toast('Write something or upload image');
  const author = ACTIVE || 'Guest';
  if(file){
    const reader = new FileReader();
    reader.onload = e => {
      db.posts.unshift({id:uid('p'),author,text,img:e.target.result,time:Date.now(),likes:[],comments:[]});
      saveDB(); renderFeed();
    };
    reader.readAsDataURL(file);
  } else {
    db.posts.unshift({id:uid('p'),author,text,img:null,time:Date.now(),likes:[],comments:[]});
    saveDB(); renderFeed();
  }
}
function toggleLike(postId){
  const p = db.posts.find(x=>x.id===postId); if(!p) return;
  const user = ACTIVE||'Guest'; const idx = p.likes.indexOf(user);
  if(idx===-1) p.likes.push(user); else p.likes.splice(idx,1);
  saveDB(); renderFeed();
}
function addComment(postId, text){
  if(!text) return;
  const p = db.posts.find(x=>x.id===postId); if(!p) return;
  const user = ACTIVE||'Guest';
  p.comments.push({id:uid('c'),user,text,time:Date.now()});
  saveDB(); renderFeed();
}
function renderFeed(){
  const el = document.getElementById('postsList'); if(!el) return;
  el.innerHTML = '';
  db.posts.forEach(p=>{
    const div = document.createElement('div'); div.className='post';
    div.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><div class="avatar">${grav(p.author)}</div><div><strong>${p.author}</strong><div class="small">${timeAgo(p.time)} ago</div></div></div>
      <div style="margin-top:8px">${escapeHtml(p.text||'')}</div>
      ${p.img?`<img src="${p.img}">`:''}
      <div class="actions" style="display:flex;gap:8px;margin-top:8px">
        <button class="btn small" onclick="toggleLike('${p.id}')">❤️ ${p.likes.length}</button>
        <button class="btn small ghost" onclick="toggleComments('${p.id}')">💬 ${p.comments.length}</button>
        <button class="btn small ghost" onclick="shareLink('${p.id}')">🔗</button>
      </div>
      <div id="comments-${p.id}" class="small" style="margin-top:8px"></div>`;
    el.appendChild(div);
    renderComments(p.id);
  });
}
function renderComments(postId){
  const p = db.posts.find(x=>x.id===postId); if(!p) return;
  const area = document.getElementById('comments-'+postId); if(!area) return;
  area.innerHTML = '';
  p.comments.forEach(c=>{
    const d = document.createElement('div'); d.className='comment'; d.style.marginTop='6px';
    d.innerHTML = `<strong>${c.user}</strong> <span class="small">${timeAgo(c.time)} ago</span><div>${escapeHtml(c.text)}</div>`;
    area.appendChild(d);
  });
  // comment input
  const inputWrap = document.createElement('div'); inputWrap.style.marginTop='8px';
  inputWrap.innerHTML = `<input placeholder="Write comment..." id="inputc-${postId}" class="input"><button class="btn small" onclick="submitComment('${postId}')">Comment</button>`;
  area.appendChild(inputWrap);
}
function submitComment(postId){
  const el = document.getElementById('inputc-'+postId); if(!el) return;
  const text = el.value.trim(); if(!text) return;
  addComment(postId,text); el.value='';
}
function toggleComments(id){
  const c = document.getElementById('comments-'+id); if(!c) return;
  c.style.display = c.style.display === 'none' ? 'block' : 'none';
}
function shareLink(id){ navigator.clipboard?.writeText(location.href + '#post=' + id); toast('Link copied'); }

/* ========== STORIES ========== */
function postStory(file){
  if(!file) return toast('Choose image');
  const r = new FileReader(); r.onload = e => { db.stories.unshift({id:uid('s'),img:e.target.result,caption:'',time:Date.now()}); // prune 24h
    db.stories = db.stories.filter(s => Date.now()-s.time < 24*3600*1000);
    saveDB(); renderStories();
  }; r.readAsDataURL(file);
}
function renderStories(){
  const el = document.getElementById('storyList'); if(!el) return;
  el.innerHTML = ''; db.stories.forEach(s=>{
    const d = document.createElement('div'); d.style.marginBottom='8px';
    d.innerHTML = `<img src="${s.img}" style="width:100%;border-radius:8px"><div class="small">${timeAgo(s.time)} ago</div>`;
    el.appendChild(d);
  });
}

/* ========== CHAT ROOMS ========== */
function createRoom(name){
  if(!name) return;
  db.rooms.push({id:uid('r'),name,messages:[]}); saveDB(); renderRooms();
}
function renderRooms(){
  const el = document.getElementById('roomList'); if(!el) return;
  el.innerHTML = ''; db.rooms.forEach(r=>{
    const b = document.createElement('div'); b.className='small'; b.style.padding='8px'; b.style.cursor='pointer';
    b.textContent = r.name; b.onclick = ()=>openRoom(r.id);
    el.appendChild(b);
  });
  if(db.rooms.length===0){
    db.rooms.push({id:'room-general',name:'Robotics Lovers',messages:[]});
    db.rooms.push({id:'room-coding',name:'Coders Corner',messages:[]});
    saveDB(); renderRooms();
  }
}
let ACTIVE_ROOM = null;
function openRoom(id){
  ACTIVE_ROOM = db.rooms.find(r=>r.id===id); document.getElementById('roomTitle').textContent = ACTIVE_ROOM.name; renderRoomMessages();
}
function renderRoomMessages(){
  const box = document.getElementById('roomChat'); if(!box || !ACTIVE_ROOM) return;
  box.innerHTML = ''; ACTIVE_ROOM.messages.forEach(m=>{
    const div = document.createElement('div'); div.style.marginBottom='8px';
    div.innerHTML = `<strong>${m.user}</strong> <span class="small">${timeAgo(m.time)} ago</span><div>${escapeHtml(m.text)}</div>`;
    box.appendChild(div);
  }); box.scrollTop = box.scrollHeight;
}
function sendRoomMessage(){
  const t = document.getElementById('roomMsg').value.trim(); if(!t || !ACTIVE_ROOM) return;
  ACTIVE_ROOM.messages.push({user:ACTIVE||'Guest',text:t,time:Date.now()}); saveDB(); document.getElementById('roomMsg').value=''; renderRoomMessages();
}

/* ========== DMS ========== */
function dmId(a,b){ return [a,b].sort().join('-'); }
function sendDM(to, text){
  if(!to || !text) return; const from = ACTIVE||'Guest'; const id = dmId(from,to);
  let conv = db.dms.find(d=>d.id===id);
  if(!conv){ conv = {id, a:from, b:to, messages:[]}; db.dms.push(conv); }
  conv.messages.push({user:from,text,time:Date.now()}); saveDB(); renderDMs();
}
function renderDMs(){
  const list = document.getElementById('dmList'); if(!list) return;
  list.innerHTML = '';
  Object.keys(db.users).forEach(u=>{
    const btn = document.createElement('div'); btn.style.marginTop='6px'; btn.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${u}</strong><div class="small">${db.users[u].bio || ''}</div></div><div><button class="btn small" onclick="openDM('${u}')">DM</button></div></div>`;
    list.appendChild(btn);
  });
}
let ACTIVE_DM = null;
function openDM(user){
  ACTIVE_DM = user; document.getElementById('dmTitle').textContent = user; renderDMBox();
}
function renderDMBox(){
  const box = document.getElementById('dmBox'); if(!box) return;
  box.innerHTML = '';
  if(!ACTIVE_DM) return;
  const id = dmId(ACTIVE||'Guest', ACTIVE_DM); const conv = db.dms.find(d=>d.id===id);
  if(!conv) return;
  conv.messages.forEach(m=>{
    const d = document.createElement('div'); d.style.marginBottom='8px'; d.innerHTML = `<strong>${m.user}</strong> <div class="small">${timeAgo(m.time)} ago</div><div>${escapeHtml(m.text)}</div>`;
    box.appendChild(d);
  }); box.scrollTop = box.scrollHeight;
}

/* ========== LESSONS (Robotics & Coding) ========== */
const roboticsLessons = [
  {id:'r1',title:'Intro to Robotics',content:'Robotics = sensors + actuators + control. Overview of parts and workflows.'},
  {id:'r2',title:'Electronics Basics',content:'Voltage, current, breadboards, resistors, LEDs, safety.'},
  {id:'r3',title:'Arduino Basics',content:'IDE, sketch structure, Blink example. Code snippets below.'},
  {id:'r4',title:'Sensors',content:'Ultrasonic, IR, LDR, temperature sensors and how to read them.'},
  {id:'r5',title:'Actuators',content:'DC motors, servos, stepper motors, motor drivers.'},
  {id:'r6',title:'Projects: Line Follower',content:'Wiring, code and tips for a line follower robot.'},
  {id:'r7',title:'Projects: Obstacle Avoider',content:'HC-SR04 integration and motor control.'},
  {id:'r8',title:'Advanced: Vision & ML',content:'Using Raspberry Pi & OpenCV for object detection.'}
];
const codingLessons = [
  {id:'c1',title:'Programming Basics', content:'Variables, loops, conditionals, functions in JS & Python.'},
  {id:'c2',title:'Web Basics', content:'HTML structure, CSS, DOM, simple JS interactivity.'},
  {id:'c3',title:'Arduino C++', content:'Types, pinModes, digitalRead/digitalWrite.'},
  {id:'c4',title:'Python for Robotics', content:'Reading sensors and controlling actuators via Raspberry Pi.'},
  {id:'c5',title:'APIs & IoT', content:'Connect robots to cloud services, MQTT, HTTP.'}
];

function renderLessons(areaId, lessons, key){
  const area = document.getElementById(areaId); if(!area) return;
  db.lessons[key] = db.lessons[key] || {};
  area.innerHTML = '';
  lessons.forEach(ls=>{
    const completed = !!db.lessons[key][ls.id];
    const d = document.createElement('div'); d.className = 'lesson';
    d.innerHTML = `<h3>${ls.title} ${completed?'<span class="small">✓</span>':''}</h3><div class="body">${escapeHtml(ls.content)}<div style="margin-top:8px"><button class="btn small" onclick="toggleLesson('${key}','${ls.id}')">${completed?'Mark undone':'Mark complete'}</button><button class="btn small ghost" onclick="viewLesson('${ls.id}','${key}')">Open</button></div></div>`;
    area.appendChild(d);
    const body = d.querySelector('.body'); body.style.display = completed ? 'block' : 'none';
    d.querySelector('h3').onclick = ()=>{ body.style.display = body.style.display==='none'?'block':'none'; };
  });
  updateLessonProgress(key, lessons.length);
}
function toggleLesson(key,id){
  db.lessons[key] = db.lessons[key] || {}; db.lessons[key][id] = !db.lessons[key][id]; saveDB(); renderLessons(key==='robotics'?'robotLessons':'codeLessons', key==='robotics'?roboticsLessons:codingLessons, key);
}
function updateLessonProgress(key, total){
  const done = Object.values(db.lessons[key]||{}).filter(Boolean).length; const pct = Math.round(done/total*100);
  const el = document.getElementById((key==='robotics'?'roboticsProgress':'codingProgress')); if(el) el.style.width = pct + '%';
}
function viewLesson(id,key){
  const list = (key==='robotics'?roboticsLessons:codingLessons); const l = list.find(x=>x.id===id);
  if(!l) return alert(l.title + '\n\n' + l.content);
}

/* ========== UTIL ========= */
function escapeHtml(s){ return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ========== PWA / INSTALL ========== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; const btn = document.getElementById('installBtn'); if(btn) btn.style.display='inline-block'; });
function promptInstall(){
  if(!deferredPrompt) return toast('Install not available'); deferredPrompt.prompt(); deferredPrompt.userChoice.then(choice => { if(choice.outcome==='accepted') toast('Installed'); deferredPrompt=null; document.getElementById('installBtn').style.display='none'; });
}

/* ========== INIT DEFAULT DATA ========== */
(function seed(){
  if(Object.keys(db.users).length===0){
    db.users['brent'] = {user:'brent',pass:'brent',bio:'Founder - Robo Genius',avatar:null,followers:[],following:[],posts:[]};
    db.users['alice'] = {user:'alice',pass:'a',bio:'Learner',avatar:null,followers:[],following:[],posts:[]};
    db.posts.unshift({id:uid('p'),author:'alice',text:'Built a simple line follower!',img:null,time:Date.now()-3600000,likes:[],comments:[]});
    db.rooms.push({id:'room-general',name:'Robotics Lovers',messages:[]});
    saveDB();
  }
})();
