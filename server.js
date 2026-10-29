/* bluff? 联机服务器：提供德州扑克和 21 点两个页面，并在同一房间的玩家之间转发消息。
   不依赖任何第三方包，Node 18+ 直接运行：node server.js
   牌局逻辑全部在房主的浏览器里运行，服务器只负责转发。 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const ROOM_IDLE_MS = 10 * 60 * 1000;
const DROP_KEEP_MS = 2 * 60 * 1000;
const PAGE = path.join(__dirname, 'index.html');
const BJ_PAGE = path.join(__dirname, 'blackjack.html');
const crypto = require('crypto');
/* admin password: set ADMIN_PASSWORD on the host to override; otherwise only this salted hash is kept here */
const ADMIN_SALT = '135cc77c600ba6a5c4ba45e065bbf2a5', ADMIN_HASH = 'f10b44b1f139ea9e43ddde1d49479ecb46f2ea8e6792e5374718c15b8da8bcfa';
const adminTries = new Map();
function adminOk(pw, ip){
  const now = Date.now(), t = (adminTries.get(ip) || []).filter(x => now - x < 60000);
  if (t.length >= 8) return false;
  t.push(now); adminTries.set(ip, t);
  pw = String(pw || '');
  if (process.env.ADMIN_PASSWORD) return pw.length === process.env.ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(process.env.ADMIN_PASSWORD));
  const got = crypto.pbkdf2Sync(pw, Buffer.from(ADMIN_SALT, 'hex'), 200000, 32, 'sha256');
  return crypto.timingSafeEqual(got, Buffer.from(ADMIN_HASH, 'hex'));
}

/* room code -> {code, host, clients: Map(id -> {id, name, res, role, alive}), touched} */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode(){
  for (;;){
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}
const cleanId = v => String(v || '').replace(/[^\w-]/g, '').slice(0, 40);
const cleanName = v => String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 8);

function push(client, msg){
  if (!client.res) return;
  try { client.res.write(`data: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}\n\n`); } catch (e) {}
}
function roster(room){
  return [...room.clients.values()].map(c => ({id:c.id, name:c.name, host:c.id === room.host, online:!!c.res}));
}
function tellHost(room, msg){ const h = room.clients.get(room.host); if (h) push(h, msg); }

function readBody(req, limit = 512 * 1024){
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', d => { size += d.length; if (size > limit){ reject(new Error('too big')); req.destroy(); } else chunks.push(d); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function json(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  res.end(JSON.stringify(obj));
}

function openStream(req, res, q){
  const room = rooms.get(String(q.get('room') || '').toUpperCase());
  const id = cleanId(q.get('id')), name = cleanName(q.get('name')) || '玩家';
  res.writeHead(200, {'Content-Type':'text/event-stream; charset=utf-8', 'Cache-Control':'no-store', 'Connection':'keep-alive', 'X-Accel-Buffering':'no'});
  res.write('retry: 2000\n\n');
  const fail = msg => { res.write(`data: ${JSON.stringify({t:'error', msg})}\n\n`); res.end(); };
  if (!id) return fail('缺少玩家编号');
  if (!room) return fail('房间不存在，可能已经关闭了');
  const game = q.get('game') === '21' ? '21' : 'holdem';
  if (room.game !== game) return fail(room.game === '21' ? '这是 21 点的房间，请在 21 点页面加入' : '这是德州扑克的房间，请在德州页面加入');
  let c = room.clients.get(id);
  if (!c){
    /* people who dropped and never came back stop holding a place */
    room.clients.forEach((o, k) => { if (!o.res && k !== room.host && Date.now() - (o.dropped || 0) > DROP_KEEP_MS) room.clients.delete(k); });
    if (room.clients.size >= MAX_PLAYERS) return fail('房间已满（最多 8 人）');
    c = {id, name, res:null};
    room.clients.set(id, c);
  }
  if (c.res && c.res !== res) try { c.res.end(); } catch (e) {}
  c.res = res; c.name = name; room.touched = Date.now();
  push(c, {t:'welcome', room:room.code, host:room.host, you:id});
  if (id !== room.host) tellHost(room, {t:'join', id, name});
  room.clients.forEach(o => push(o, {t:'roster', list:roster(room)}));
  req.on('close', () => {
    if (c.res !== res) return;
    c.res = null; c.dropped = room.touched = Date.now();
    if (id === room.host) room.clients.forEach(o => { if (o !== c) push(o, {t:'hostgone'}); });
    else tellHost(room, {t:'drop', id});
    room.clients.forEach(o => push(o, {t:'roster', list:roster(room)}));
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html')){
      const html = fs.readFileSync(PAGE);
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache'});
      return res.end(html);
    }
    if (req.method === 'GET' && (p === '/21' || p === '/blackjack.html' || p === '/blackjack')){
      const html = fs.readFileSync(BJ_PAGE);
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache'});
      return res.end(html);
    }
    const art = /^\/assets\/dealers\/(Sally|Nemo|Xiao_Nuo|Nai_Wa|Yi)\.png$/.exec(p);
    if ((req.method === 'GET' || req.method === 'HEAD') && art){
      res.writeHead(200, {'Content-Type':'image/png', 'Cache-Control':'public, max-age=604800'});
      return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, 'public', 'assets', 'dealers', art[1] + '.png')));
    }
    if (p === '/api/ping') return json(res, 200, {ok:true});
    if (p === '/api/events' && req.method === 'GET') return openStream(req, res, u.searchParams);
    if (req.method === 'POST' && p === '/api/create'){
      const b = await readBody(req), id = cleanId(b.id);
      if (!id) return json(res, 400, {error:'缺少玩家编号'});
      const code = newCode();
      rooms.set(code, {code, host:id, clients:new Map(), touched:Date.now(), game:b.game === '21' ? '21' : 'holdem'});
      return json(res, 200, {room:code});
    }
    if (req.method === 'POST' && p === '/api/send'){
      const b = await readBody(req);
      const room = rooms.get(String(b.room || '').toUpperCase()), id = cleanId(b.id);
      if (!room || !room.clients.has(id)) return json(res, 404, {error:'不在房间里'});
      room.touched = Date.now();
      for (const m of Array.isArray(b.batch) ? b.batch : []){
        if (!m || typeof m !== 'object') continue;
        const body = Object.assign({}, m.msg, {from:id}); delete body.sys;   /* only the server marks messages as sys */
        const payload = JSON.stringify(body);
        if (m.to === '*') room.clients.forEach(c => push(c, payload));
        else if (id === room.host){ const c = room.clients.get(cleanId(m.to)); if (c) push(c, payload); }
        else tellHost(room, payload);   /* guests can only talk to the host (or everyone) */
      }
      return json(res, 200, {ok:true});
    }
    if (req.method === 'POST' && p === '/api/admin'){
      const b = await readBody(req, 64 * 1024);
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (!adminOk(b.password, ip)) return json(res, 403, {error:'密码不对'});
      if (b.check) return json(res, 200, {ok:true});
      const room = rooms.get(String(b.room || '').toUpperCase()), id = cleanId(b.id);
      if (!room || !room.clients.has(id)) return json(res, 404, {error:'不在房间里'});
      const edits = (Array.isArray(b.edits) ? b.edits : []).slice(0, 8).map(e => ({name:String(e && e.name || '').slice(0, 12), chips:Math.max(0, Math.min(10000000, Math.round(+(e && e.chips)) || 0))}));
      tellHost(room, {t:'admin', sys:true, edits, from:id});
      return json(res, 200, {ok:true});
    }
    if (req.method === 'POST' && p === '/api/leave'){
      const b = await readBody(req);
      const room = rooms.get(String(b.room || '').toUpperCase()), id = cleanId(b.id);
      if (room && room.clients.has(id)){
        const c = room.clients.get(id);
        if (c.res) try { c.res.end(); } catch (e) {}
        room.clients.delete(id);
        if (id === room.host){ room.clients.forEach(o => push(o, {t:'closed'})); rooms.delete(room.code); }
        else { tellHost(room, {t:'leave', id}); room.clients.forEach(o => push(o, {t:'roster', list:roster(room)})); }
      }
      return json(res, 200, {ok:true});
    }
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('not found');
  } catch (e) {
    if (!res.headersSent) json(res, 400, {error:'bad request'});
  }
});

/* keep streams alive through proxies, close rooms nobody uses */
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    room.clients.forEach(c => { if (c.res) try { c.res.write(': ping\n\n'); } catch (e) {} });
    const anyone = [...room.clients.values()].some(c => c.res);
    if (!anyone && now - room.touched > ROOM_IDLE_MS) rooms.delete(code);
  });
}, 20000);

server.listen(PORT, () => console.log(`德州扑克联机服务器已启动：http://localhost:${PORT}`));
