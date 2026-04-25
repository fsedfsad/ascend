// ─── DEBUG: log every require so we can pinpoint a crash ──────────────────────
console.log('[DEBUG] Process starting...');
console.log('[DEBUG] Node version:', process.version);
console.log('[DEBUG] Platform:', process.platform, process.arch);

try { require('dotenv').config(); console.log('[DEBUG] dotenv OK'); }
catch(e) { console.error('[DEBUG] dotenv FAILED:', e.message); process.exit(1); }

try { require('discord.js'); console.log('[DEBUG] discord.js OK'); }
catch(e) { console.error('[DEBUG] discord.js FAILED:', e.message); process.exit(1); }

try { require('@napi-rs/canvas'); console.log('[DEBUG] @napi-rs/canvas OK'); }
catch(e) { console.error('[DEBUG] @napi-rs/canvas FAILED:', e.message); process.exit(1); }

console.log('[DEBUG] All requires passed, loading app...');
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionsBitField,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require('discord.js');
const express = require('express');
const util    = require('util');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

// ─── EXPRESS SERVER ────────────────────────────────────────────────────────────
const app = express();
app.get('/', (_req, res) => res.send('Ascend Bot is alive! 🤖'));
app.listen(process.env.PORT || 3000, () =>
  console.log(`[Server] Running on port ${process.env.PORT || 3000}`)
);

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const EMBED_COLOR        = 0x242429;
const OWNER_ID           = '1443949062952058995';
const GHOST_PING_CHANNEL_ID = '1462389865382547621';

const CLIENT_ROLE_IDS    = ['1462396655558201365', '1448123817338867832'];
const TICKET_CLOSE_ROLE_ID  = '1462396655558201365';
const TICKET_CATEGORY_ID    = '1478617294648115423';
const TICKET_STAFF_ROLE_ID  = '1462396655558201365';
const QUESTIONS_INBOX_CHANNEL_ID = '1463809063157629044';

const AUTO_REACT_CHANNEL_IDS = [
  '1462389447650967744',
  '1429961951097651261',
  '1462396052266156135',
];

const KEYWORD_REPLIES = [
  { keywords: ['glass container', 'glass containers'], reply: 'https://amzn.to/4kdIdDa' },
  { keywords: ['walking pad'], reply: 'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_apin_aipsfshop_F4YD211TGMS366HYB7D7_1&language=en-US' },
  { keywords: ['ehp', 'protein powder', 'preworkout', 'pre workout', 'creatine', 'oxyshred', 'whey'], reply: 'https://ehplabs.com.au/discount/ANABOLIC' },
  { keywords: ['grips'], reply: 'https://www.versagripps.com/gabrielchenkov-shaw' },
  { keywords: ['vitamins', 'nattyplus', 'natty plus'], reply: 'https://nattyplussupps.com/anabolic' },
];
const keywordCooldowns  = new Map();
const KEYWORD_COOLDOWN_MS = 5 * 60 * 1000;

const LINK_OPTIONS = [
  { name: 'Walking Pad',    value: 'walkingpad',    url: 'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_apin_aipsfshop_F4YD211TGMS366HYB7D7_1&language=en-US' },
  { name: 'EHP Labs',       value: 'ehp',           url: 'https://ehplabs.com.au/discount/ANABOLIC' },
  { name: 'Natty Plus',     value: 'nattyplus',     url: 'https://nattyplussupps.com/anabolic' },
  { name: 'Versa Gripps',   value: 'versa',         url: 'https://www.versagripps.com/gabrielchenkov-shaw' },
  { name: 'Glass Container',value: 'glasscontainer',url: 'https://amzn.to/4kdIdDa' },
];

const STICKY_MESSAGES = [
  {
    channelId: '1429961951097651261',
    title: 'Get Featured on the Ascend Instagram',
    description: "If you would like your win featured, tag @ascendperformance.au on your post or story and we'll repost it!\n\nhttps://www.instagram.com/ascendperformance.au/",
  },
  {
    channelId: '1462396052266156135',
    title: 'Unsure how to start? Try this:',
    description: '* Share a picture of yourself\n* Name & Country\n* Achievements + Future Goals\n* Social Platforms (only allowed in this channel)\n\nFor the best community experience, we suggest you change your nickname to your IRL name, and an appropriate profile picture!',
  },
  {
    channelId: '1462389447650967744',
    title: 'You can find more of our testimonials here:',
    description: 'https://www.anabolic.au/',
  },
];

const ROTATING_MESSAGE = {
  channelId:  '1471066886031540349',
  intervalMs: 60 * 60 * 1000,
  title:      'Gabes Amazon Storefront',
  description: 'Check out Gabes Amazon storefront featuring products he personally uses day to day. From walking pads and content creation kits to cooking essentials, recovery tools, and sleep maxxing gear — everything is hand-picked to support performance, productivity, and health.',
  buttonLabel: '🛒 View Store',
  buttonUrl:   'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_cp_ud_aipsfshop_TANG1M7CGF6JP95F6ERR',
};

const THREAD_AUTO_MESSAGES = [
  {
    parentChannelId: '1471068205404520469',
    title: 'Natty Plus Supplements & EHP Labs',
    description: "Natty Plus Supplements and EHP Labs are raising the standard for serious training. Natty Plus Supplements delivers premium products built for lifters who care about quality, transparency, and results. EHP Labs is known globally for clinically dosed formulas like OxyShred and Beyond BCAA - designed to support performance, recovery, and body composition without the fluff.\nIf you're training with intent, fuel yourself with brands that do the same. Precision in. Power out.",
    buttons: [
      { label: '🔥 EHP Labs',  url: 'https://ehplabs.com.au/discount/ANABOLIC' },
      { label: '💊 Natty Plus', url: 'https://nattyplussupps.com/anabolic' },
    ],
  },
  {
    parentChannelId: '1465489677762039838',
    title: 'Versa Gripps',
    description: "Engineered for serious lifters, Versa Gripps provide fast, secure wrist support and a locked-in hold on the bar - no awkward wrapping, no wasted time between sets. Whether you're pulling heavy deadlifts, grinding through rows, or pushing your back days harder than ever, they let you focus on the target muscle instead of fighting your grip.\n\nTrain stronger. Lift longer. Remove the weak link.",
    buttons: [{ label: '🛒 Shop Versa Gripps', url: 'https://www.versagripps.com/?sca_ref=8008738.NxqfWnUjps&utm_source=affiliate&utm_medium=versa-gripps-affiliate-program&utm_campaign=8008738' }],
  },
];

// ─── XP CONFIG ─────────────────────────────────────────────────────────────────
const DOUBLE_XP_CHANNEL_IDS = ['1429961951097651261', '1462389447650967744'];

const LEVEL_ROLES = {
  5:   '1465937177883181166',
  10:  '1465937430661042329',
  20:  '1465937503889657992',
  30:  '1465937567789744128',
  40:  '1465937603198189600',
  50:  '1465937635267575909',
  70:  '1465937799546015928',
  80:  '1465937866671784099',
  100: '1465937932870484143',
};
const MILESTONE_LEVELS = Object.keys(LEVEL_ROLES).map(Number).sort((a, b) => a - b);

// ── XP math ────────────────────────────────────────────────────────────────────
// XP to complete level N (go from level N to N+1)
function xpToNextLevel(level) {
  return Math.floor(5 * Math.pow(level, 2) + 50 * level + 100);
}

// Total XP to *reach* a given level from 0
function totalXPForLevel(level) {
  let t = 0;
  for (let i = 0; i < level; i++) t += xpToNextLevel(i);
  return t;
}

// Given raw total XP → { level, currentXP (within level), neededXP (to finish level) }
function parseLevelData(totalXP) {
  let level = 0, remaining = totalXP || 0;
  while (true) {
    const needed = xpToNextLevel(level);
    if (remaining < needed) return { level, currentXP: remaining, neededXP: needed };
    remaining -= needed;
    level++;
  }
}

// ── MESSAGE XP ─────────────────────────────────────────────────────────────────
// TEST MODE: every message grants exactly enough XP to reach the next level.
// To revert, replace grantXP call in handleMessageXP with the commented line.
const MSG_COOLDOWN_MS = 60 * 1000;
const xpCooldowns    = new Map();

function calculateMessageXP(content) {
  const base        = Math.floor(Math.random() * 26) + 15; // 15–40
  const lengthBonus = Math.min(Math.floor(content.replace(/\s+/g, ' ').trim().length / 100) * 5, 25);
  return base + lengthBonus;
}

// ─── DATA PERSISTENCE — JSONBin.io (free, no disk needed) ─────────────────────
//
//  Sign up free at https://jsonbin.io → grab your Master Key
//  Create TWO bins (one for XP, one for achievements) → grab both Bin IDs
//  Set these 3 env vars in Render:
//    JSONBIN_KEY   = your Master Key  (e.g. $2a$10$abc...)
//    XP_BIN_ID     = bin ID for XP data  (e.g. 64af1234abc...)
//    ACH_BIN_ID    = bin ID for achievements (e.g. 64af5678def...)
//
const JSONBIN_KEY  = process.env.JSONBIN_KEY  || '';
const XP_BIN_ID   = process.env.XP_BIN_ID    || '';
const ACH_BIN_ID  = process.env.ACH_BIN_ID   || '';
const JSONBIN_BASE = 'api.jsonbin.io';

if (!JSONBIN_KEY || !XP_BIN_ID || !ACH_BIN_ID) {
  console.warn('┌─────────────────────────────────────────────────────────┐');
  console.warn('│  WARNING: JSONBin env vars not set!                     │');
  console.warn('│  Set JSONBIN_KEY, XP_BIN_ID, ACH_BIN_ID in Render.     │');
  console.warn('│  Data will NOT persist across restarts until you do.    │');
  console.warn('└─────────────────────────────────────────────────────────┘');
}

// Low-level JSONBin GET/PUT
function jsonbinGet(binId) {
  return new Promise((resolve) => {
    const options = {
      hostname: JSONBIN_BASE,
      path: `/v3/b/${binId}/latest`,
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_KEY },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed?.record ?? null);
        } catch { resolve(null); }
      });
    });
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function jsonbinPut(binId, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: JSONBIN_BASE,
      path: `/v3/b/${binId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Master-Key': JSONBIN_KEY,
        'X-Bin-Versioning': 'true', // don't keep old versions, saves quota
      },
    };
    const req = https.request(options, (res) => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => resolve(true));
    });
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

// ── XP DATA ────────────────────────────────────────────────────────────────────
let xpData = {};
let _xpSaveTimer = null;
let _xpLoaded = false;

async function loadXpData() {
  if (!XP_BIN_ID) { console.log('[XP] No XP_BIN_ID — starting fresh (not persisted)'); _xpLoaded = true; return; }
  console.log('[XP] Loading from JSONBin...');
  const record = await jsonbinGet(XP_BIN_ID);
  if (record && typeof record === 'object' && Object.keys(record).length > 0) {
    xpData = record;
    _xpLoaded = true;
    console.log(`[XP] Loaded ${Object.keys(xpData).length} users`);
  } else if (record && typeof record === 'object') {
    // Bin exists but is empty — safe to treat as fresh
    _xpLoaded = true;
    console.log('[XP] Bin is empty — starting fresh');
  } else {
    // Null response = network/timeout issue — do NOT mark as loaded, block saves
    console.error('[XP] Failed to load from JSONBin — saves blocked until next restart to protect data');
  }
}

function saveXpData() {
  if (!XP_BIN_ID) return;
  if (!_xpLoaded) { console.warn('[XP] Save blocked — data not loaded yet'); return; }
  if (Object.keys(xpData).length === 0) { console.warn('[XP] Save blocked — xpData is empty, refusing to overwrite'); return; }
  // Debounce — wait 10 s after last change before writing, to batch rapid XP gains
  if (_xpSaveTimer) clearTimeout(_xpSaveTimer);
  _xpSaveTimer = setTimeout(async () => {
    const ok = await jsonbinPut(XP_BIN_ID, xpData);
    if (ok) console.log(`[XP] Saved ${Object.keys(xpData).length} users to JSONBin`);
    else    console.error('[XP] Save failed — will retry on next change');
  }, 10_000);
}

function getUserData(userId) {
  if (!xpData[userId]) xpData[userId] = { xp: 0, level: 0 };
  return xpData[userId];
}

// ─── ACHIEVEMENTS ──────────────────────────────────────────────────────────────
// { id, emoji, name, description, trigger }
// triggers checked in code by id
const ACHIEVEMENTS = [
  { id: 'testimonial',    emoji: '📝', name: 'Testimonial',      description: 'Wrote your first testimonial in the testimonials channel.' },
  { id: 'introduction',  emoji: '👋', name: 'Hello World',       description: 'Introduced yourself to the community.' },
  { id: 'first_win',     emoji: '🏆', name: 'First Win',         description: 'Shared your first win in the wins channel.' },
  { id: 'thread_master', emoji: '🧵', name: 'Thread Master',     description: 'Created a thread in the community.' },
  { id: 'daily_grind',   emoji: '💪', name: 'Daily Grind',       description: 'Sent a message in the daily check-in channel.' },
  { id: 'level_5',       emoji: '⭐', name: 'Rising Star',       description: 'Reached level 5.' },
  { id: 'level_10',      emoji: '🌟', name: 'Committed',         description: 'Reached level 10.' },
  { id: 'level_20',      emoji: '💫', name: 'Dedicated',         description: 'Reached level 20.' },
  { id: 'level_50',      emoji: '🔥', name: 'On Fire',           description: 'Reached level 50.' },
  { id: 'level_100',     emoji: '👑', name: 'Legend',            description: 'Reached level 100.' },
];

// Channel → achievement id mapping for first-message achievements
const CHANNEL_ACHIEVEMENTS = {
  '1462389447650967744': 'testimonial',
  '1462396052266156135': 'introduction',
  '1429961951097651261': 'first_win',
  '1496417988780228669': 'daily_grind',
};

// Thread category for Thread Master achievement
const THREAD_ACHIEVEMENT_CATEGORY = '1471066298703282238';

// ── ACHIEVEMENT DATA ────────────────────────────────────────────────────────────
let achData = {}; // { [userId]: Set of achievement ids }
let _achSaveTimer = null;

async function loadAchData() {
  if (!ACH_BIN_ID) { console.log('[ACH] No ACH_BIN_ID — starting fresh (not persisted)'); return; }
  console.log('[ACH] Loading from JSONBin...');
  const record = await jsonbinGet(ACH_BIN_ID);
  if (record && typeof record === 'object') {
    for (const [uid, ids] of Object.entries(record))
      achData[uid] = new Set(Array.isArray(ids) ? ids : []);
    console.log(`[ACH] Loaded achievements for ${Object.keys(achData).length} users`);
  } else {
    console.log('[ACH] No existing data — starting fresh');
  }
}

function saveAchData() {
  if (!ACH_BIN_ID) return;
  if (_achSaveTimer) clearTimeout(_achSaveTimer);
  _achSaveTimer = setTimeout(async () => {
    const out = {};
    for (const [uid, set] of Object.entries(achData)) out[uid] = [...set];
    const ok = await jsonbinPut(ACH_BIN_ID, out);
    if (ok) console.log('[ACH] Saved to JSONBin');
    else    console.error('[ACH] Save failed');
  }, 10_000);
}

function getUserAch(userId) {
  if (!achData[userId]) achData[userId] = new Set();
  return achData[userId];
}

// Grant an achievement — returns true if newly unlocked
async function grantAchievement(userId, achId, guild) {
  const set = getUserAch(userId);
  if (set.has(achId)) return false;
  set.add(achId);
  saveAchData();

  const ach = ACHIEVEMENTS.find(a => a.id === achId);
  if (!ach) return true;

  console.log(`[ACH] ${userId} unlocked: ${achId}`);

  // DM the user
  try {
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${ach.emoji} Achievement Unlocked!`)
        .setDescription(`**${ach.name}**\n${ach.description}`)
        .setFooter({ text: 'Use /achievements to see all your achievements' })
        .setTimestamp();
      await user.send({ embeds: [embed] }).catch(() => null);
    }
  } catch (_) {}

  return true;
}

// Check channel-based first-message achievements
async function checkChannelAchievement(userId, channelId, guild) {
  const achId = CHANNEL_ACHIEVEMENTS[channelId];
  if (!achId) return;
  await grantAchievement(userId, achId, guild);
}

// Check level-based achievements
async function checkLevelAchievements(userId, level, guild) {
  const levelAch = { 5: 'level_5', 10: 'level_10', 20: 'level_20', 50: 'level_50', 100: 'level_100' };
  if (levelAch[level]) await grantAchievement(userId, levelAch[level], guild);
}

// ─── FONTS ─────────────────────────────────────────────────────────────────────
// Priority: ./fonts/ (committed to repo) → system Liberation → system DejaVu
(function registerFonts() {
  const FONT_DIR = path.join(__dirname, 'fonts');
  const interBold     = path.join(FONT_DIR, 'inter-bold.ttf');
  const interSemiBold = path.join(FONT_DIR, 'inter-semibold.ttf');
  const interRegular  = path.join(FONT_DIR, 'inter-regular.ttf');

  if (fs.existsSync(interBold) && fs.existsSync(interRegular)) {
    GlobalFonts.registerFromPath(interBold,     'UI Bold');
    GlobalFonts.registerFromPath(interSemiBold, 'UI SemiBold');
    GlobalFonts.registerFromPath(interRegular,  'UI');
    console.log('[Canvas] Inter fonts loaded from ./fonts/');
    return;
  }

  // Render / Debian system fonts
  const LIBERATION = '/usr/share/fonts/truetype/liberation';
  const DEJAVU     = '/usr/share/fonts/truetype/dejavu';

  const boldPath = [
    path.join(LIBERATION, 'LiberationSans-Bold.ttf'),
    path.join(DEJAVU,     'DejaVuSans-Bold.ttf'),
  ].find(fs.existsSync);

  const regularPath = [
    path.join(LIBERATION, 'LiberationSans-Regular.ttf'),
    path.join(DEJAVU,     'DejaVuSans.ttf'),
  ].find(fs.existsSync);

  if (boldPath && regularPath) {
    GlobalFonts.registerFromPath(boldPath,    'UI Bold');
    GlobalFonts.registerFromPath(boldPath,    'UI SemiBold');
    GlobalFonts.registerFromPath(regularPath, 'UI');
    console.log('[Canvas] System fonts loaded (fallback):', boldPath);
  } else {
    console.warn('[Canvas] WARNING: No fonts found — cards will use canvas default font');
  }
})();

// ─── CARD HELPERS ──────────────────────────────────────────────────────────────
// Fetch image bytes — hard 5 s timeout so a slow CDN never blocks the interaction
function fetchBuf(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchBuf(res.headers.location).then(resolve);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error',() => resolve(null));
    });
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

async function safeAvatar(url) {
  if (!url) return null;
  try {
    const buf = await fetchBuf(url);
    return buf && buf.length > 0 ? await loadImage(buf) : null;
  } catch { return null; }
}

// Clip-circle avatar draw (no ring — caller draws ring before calling this)
function clipAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  else      { ctx.fillStyle = '#1e1e24'; ctx.fill(); }
  ctx.restore();
}

// Rounded rect path
function rr(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// Truncate text to fit maxW pixels
function clip(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// Draw a pill-shaped progress bar
function bar(ctx, x, y, w, h, pct, color) {
  const r  = h / 2;
  const fw = Math.max(r * 2, Math.min(pct, 1) * w);
  // track
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  rr(ctx, x, y, w, h, r); ctx.fill();
  // fill
  ctx.fillStyle = color;
  rr(ctx, x, y, fw, h, r); ctx.fill();
}

// ─── RANK CARD  934 × 282  (Mee6-style layout) ───────────────────────────────
//
//  Large circular avatar left · RANK #N  LEVEL N top-right of content
//  Big username · thick rounded XP bar · server name + XP count at bottom
//
async function drawRankCard({ username, avatarUrl, level, rank, currentXP, neededXP, totalXP, guildName }) {
  const W = 934, H = 282;
  const c   = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // ── Background (same dark as all other cards) ──
  ctx.fillStyle = '#13131a';
  ctx.fillRect(0, 0, W, H);
  const tint = ctx.createLinearGradient(0, 0, W, H);
  tint.addColorStop(0, 'rgba(88,101,242,0.09)');
  tint.addColorStop(1, 'rgba(88,101,242,0)');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);

  // ── Avatar ──
  const AVR = 94, AVX = 36 + AVR, AVY = H / 2;
  ctx.beginPath();
  ctx.arc(AVX, AVY, AVR + 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  clipAvatar(ctx, await safeAvatar(avatarUrl), AVX, AVY, AVR);

  // ── Content block — vertically centred ──
  const BLOCK_H = 36 + 14 + 38 + 12 + 26 + 14 + 16; // ~156px
  const BLOCK_Y = Math.round(H / 2 - BLOCK_H / 2);
  const CX = AVX + AVR + 32;
  const CW = W - CX - 28;

  // Row 1: RANK #N  LEVEL N
  let cy = BLOCK_Y + 32;

  ctx.font      = `bold 13px "UI SemiBold"`;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('RANK', CX, cy);
  const rLW = ctx.measureText('RANK').width + 8;

  ctx.font      = `bold 34px "UI Bold"`;
  ctx.fillStyle = '#ffffff';
  const rvStr   = `#${rank}`;
  ctx.fillText(rvStr, CX + rLW, cy + 2);
  const rvW = ctx.measureText(rvStr).width + 22;

  ctx.font      = `bold 13px "UI SemiBold"`;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('LEVEL', CX + rLW + rvW, cy);
  const lLW = ctx.measureText('LEVEL').width + 8;

  ctx.font      = `bold 34px "UI Bold"`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${level}`, CX + rLW + rvW + lLW, cy + 2);

  // Row 2: Username
  cy += 14 + 38;
  ctx.font      = `bold 34px "UI Bold"`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(clip(ctx, username, CW), CX, cy);

  // Row 3: XP bar
  const BAR_Y = cy + 12, BAR_H = 26;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  rr(ctx, CX, BAR_Y, CW, BAR_H, BAR_H / 2);
  ctx.fill();
  const pct = neededXP > 0 ? Math.min(currentXP / neededXP, 1) : 0;
  const fw  = Math.max(BAR_H, pct * CW);
  ctx.fillStyle = '#5865f2';
  rr(ctx, CX, BAR_Y, fw, BAR_H, BAR_H / 2);
  ctx.fill();

  // Row 4: server name + XP count
  const BOT_Y = BAR_Y + BAR_H + 16;
  ctx.font      = `bold 14px "UI SemiBold"`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(guildName || 'Ascend Community', CX, BOT_Y);

  const xpStr = `${currentXP.toLocaleString()} / ${neededXP.toLocaleString()} XP`;
  ctx.font      = `14px "UI"`;
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText(xpStr, CX + CW - ctx.measureText(xpStr).width, BOT_Y);

  return c.toBuffer('image/png');
}

// ─── LEADERBOARD  680 × dynamic ───────────────────────────────────────────────
async function drawLeaderboard(entries) {
  const W        = 680;
  const ROW_H    = 64;
  const TITLE_H  = 52;
  const RANK_COL = 32;   // width of rank-number column (left of avatar)
  const AVT      = ROW_H; // square avatar column
  const LVL_W    = 80;   // reserved right column for "LVL: XX"
  const BAR_PX   = 3;    // XP bar height in px
  const H        = TITLE_H + entries.length * ROW_H;

  const c   = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, W, H);

  // Title bar
  ctx.fillStyle = '#17181b';
  ctx.fillRect(0, 0, W, TITLE_H);
  ctx.beginPath();
  ctx.arc(20, TITLE_H / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#5865f2';
  ctx.fill();
  ctx.font      = `bold 19px "UI Bold"`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Leaderboard', 32, TITLE_H / 2 + 7);

  const MEDAL = ['#f0b429', '#b8c4cc', '#cd8855'];

  for (let i = 0; i < entries.length; i++) {
    const e      = entries[i];
    const Y      = TITLE_H + i * ROW_H;
    const accent = i < 3 ? MEDAL[i] : '#5865f2';

    // Row bg (alternating)
    ctx.fillStyle = i % 2 === 0 ? '#1e1f22' : '#222428';
    ctx.fillRect(0, Y, W, ROW_H);
    // Subtle divider
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, Y, W, 1);

    // ── Rank number (centred in rank col) ──
    ctx.font      = i < 3 ? `bold 15px "UI Bold"` : `13px "UI"`;
    ctx.fillStyle = i < 3 ? MEDAL[i] : 'rgba(255,255,255,0.35)';
    const rankStr = `#${i + 1}`;
    const rankW   = ctx.measureText(rankStr).width;
    ctx.fillText(rankStr, RANK_COL / 2 - rankW / 2, Y + ROW_H / 2 + 5);

    // ── Avatar (square, after rank col) ──
    ctx.fillStyle = '#2a2b30';
    ctx.fillRect(RANK_COL, Y, AVT, AVT);
    const avatarImg = await safeAvatar(e.avatarUrl);
    if (avatarImg) ctx.drawImage(avatarImg, RANK_COL, Y, AVT, AVT);
    // Top-3 accent stripe on left edge of avatar
    if (i < 3) {
      ctx.fillStyle = MEDAL[i];
      ctx.fillRect(RANK_COL, Y, 3, AVT);
    }

    // ── Username ──
    const TX          = RANK_COL + AVT + 14;
    const MAX_NAME_W  = W - TX - LVL_W - 16;
    ctx.font      = `bold 16px "UI Bold"`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(clip(ctx, `@${e.username}`, MAX_NAME_W), TX, Y + ROW_H / 2 + 6);

    // ── LVL: XX (right-aligned) ──
    const lvlStr = `LVL: ${e.level}`;
    ctx.font      = `bold 15px "UI Bold"`;
    ctx.fillStyle = accent;
    const lvlMW   = ctx.measureText(lvlStr).width;
    ctx.fillText(lvlStr, W - lvlMW - 14, Y + ROW_H / 2 + 6);

    // ── XP bar (bottom of row, content area only) ──
    const BAR_X = TX;
    const BAR_W = W - TX - 14;
    const BAR_Y = Y + ROW_H - BAR_PX;
    const pct   = e.neededXP > 0 ? Math.min(e.currentXP / e.neededXP, 1) : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_PX);
    ctx.fillStyle = accent;
    ctx.fillRect(BAR_X, BAR_Y, BAR_W * pct, BAR_PX);
  }

  return c.toBuffer('image/png');
}

// ─── CLIENT ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction],
});

const stickyCache = new Map();
let rotatingMessageId          = null;
let rotatingChannelLastActivity = 0;

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function buildButtonRows(buttonsRaw) {
  const parts = buttonsRaw.split('|').map(s => s.trim());
  const btns  = [];
  for (let i = 0; i + 1 < parts.length; i += 2)
    if (parts[i] && parts[i + 1])
      btns.push(new ButtonBuilder().setLabel(parts[i]).setURL(parts[i + 1]).setStyle(ButtonStyle.Link));
  const rows = [];
  for (let i = 0; i < btns.length && i < 15; i += 5)
    rows.push(new ActionRowBuilder().addComponents(...btns.slice(i, i + 5)));
  return rows;
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── READY ─────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);

  // Load persisted data first — everything else depends on this
  await loadXpData();
  await loadAchData();

  // Register slash commands
  try {
    const rest  = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    const cmds = [
      new SlashCommandBuilder()
        .setName('eval').setDescription('Evaluate JavaScript (owner only)')
        .addStringOption(o => o.setName('code').setDescription('Code to run').setRequired(true)),

      new SlashCommandBuilder()
        .setName('info').setDescription('Display server and bot info'),

      new SlashCommandBuilder()
        .setName('embed').setDescription('Send a message or embed (owner only)')
        .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(o => o.setName('content').setDescription('Plain text content'))
        .addStringOption(o => o.setName('image_url').setDescription('Image URL to attach'))
        .addStringOption(o => o.setName('title').setDescription('Embed title'))
        .addStringOption(o => o.setName('description').setDescription('Embed description (use \\n for newlines)'))
        .addStringOption(o => o.setName('color').setDescription('Hex colour e.g. #ff0000'))
        .addStringOption(o => o.setName('footer').setDescription('Footer text'))
        .addStringOption(o => o.setName('footer_icon').setDescription('Footer icon URL'))
        .addStringOption(o => o.setName('image').setDescription('Large image URL (inside embed)'))
        .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL'))
        .addStringOption(o => o.setName('author').setDescription('Author name'))
        .addStringOption(o => o.setName('author_icon').setDescription('Author icon URL'))
        .addStringOption(o => o.setName('author_url').setDescription('Author URL'))
        .addStringOption(o => o.setName('buttons').setDescription('Label1|URL1|Label2|URL2 … (up to 15)'))
        .addBooleanOption(o => o.setName('timestamp').setDescription('Add timestamp')),

      new SlashCommandBuilder()
        .setName('verify').setDescription('Verify a member (staff only)')
        .addUserOption(o => o.setName('member').setDescription('Member to verify').setRequired(true)),

      new SlashCommandBuilder()
        .setName('link').setDescription('Post an affiliate link')
        .addStringOption(o => o.setName('product').setDescription('Choose a product').setRequired(true)
          .addChoices(...LINK_OPTIONS.map(l => ({ name: l.name, value: l.value })))),

      new SlashCommandBuilder()
        .setName('tickets').setDescription('Send the ticket panel (owner only)'),

      new SlashCommandBuilder()
        .setName('question').setDescription('Send the anonymous question panel (owner only)'),

      new SlashCommandBuilder()
        .setName('add').setDescription('Add a user to this ticket (staff only)')
        .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)),

      new SlashCommandBuilder()
        .setName('remove').setDescription('Remove a user from this ticket (staff only)')
        .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)),

      new SlashCommandBuilder()
        .setName('achievements').setDescription("View your achievements (or another member's)")
        .addUserOption(o => o.setName('member').setDescription('Member to check')),

      new SlashCommandBuilder()
        .setName('level').setDescription("Check your level card (or another member's)")
        .addUserOption(o => o.setName('member').setDescription('Member to check')),

      new SlashCommandBuilder()
        .setName('leaderboard').setDescription('View the XP leaderboard'),

      new SlashCommandBuilder()
        .setName('givexp').setDescription('Give XP to a member (owner only)')
        .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP').setRequired(true).setMinValue(1)),

      new SlashCommandBuilder()
        .setName('setlevel').setDescription("Set a member's level (owner only)")
        .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))
        .addIntegerOption(o => o.setName('level').setDescription('New level').setRequired(true).setMinValue(0)),

    ].map(c => c.toJSON());

    await rest.put(route, { body: cmds });
    console.log('[Bot] Slash commands registered');
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
  }

  // Sticky messages
  for (const cfg of STICKY_MESSAGES) {
    try {
      const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch) continue;
      let fetched;
      do {
        fetched = await ch.messages.fetch({ limit: 100 });
        for (const [, m] of fetched.filter(m => m.author.id === client.user.id))
          await m.delete().catch(() => null);
      } while (fetched.size === 100);
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(cfg.title).setDescription(cfg.description);
      const sent = await ch.send({ embeds: [embed] });
      stickyCache.set(cfg.channelId, sent.id);
    } catch (err) { console.error(`[Sticky] ${cfg.channelId}:`, err); }
  }

  // Seed rotating channel activity
  try {
    const rotCh = await client.channels.fetch(ROTATING_MESSAGE.channelId).catch(() => null);
    if (rotCh) {
      const recent = await rotCh.messages.fetch({ limit: 50 });
      const last   = recent.filter(m => !m.author.bot).first();
      if (last) rotatingChannelLastActivity = last.createdTimestamp;
    }
  } catch (_) {}

  sendRotatingMessage();
  setInterval(sendRotatingMessage, ROTATING_MESSAGE.intervalMs);

  // Start VC XP ticker
  startVcXpTicker();
});

// ─── ROTATING MESSAGE ──────────────────────────────────────────────────────────
async function sendRotatingMessage() {
  try {
    const now = Date.now();
    if (now - rotatingChannelLastActivity >= ROTATING_MESSAGE.intervalMs) {
      console.log('[Rotating] Skipped — no recent activity');
      return;
    }
    const ch = await client.channels.fetch(ROTATING_MESSAGE.channelId).catch(() => null);
    if (!ch) return;
    if (rotatingMessageId) {
      const old = await ch.messages.fetch(rotatingMessageId).catch(() => null);
      if (old) await old.delete().catch(() => null);
    }
    const embed = new EmbedBuilder().setColor(EMBED_COLOR)
      .setTitle(ROTATING_MESSAGE.title).setDescription(ROTATING_MESSAGE.description);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel(ROTATING_MESSAGE.buttonLabel)
        .setURL(ROTATING_MESSAGE.buttonUrl).setStyle(ButtonStyle.Link)
    );
    const sent = await ch.send({ embeds: [embed], components: [row] });
    rotatingMessageId = sent.id;
    console.log('[Rotating] Sent');
  } catch (err) { console.error('[Rotating]', err); }
}

// ─── GHOST PING ────────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  try {
    const ch = member.guild.channels.cache.get(GHOST_PING_CHANNEL_ID);
    if (!ch) return;
    const msg = await ch.send(`<@${member.id}>`);
    await msg.delete();
  } catch (err) { console.error('[GhostPing]', err); }
});

// ─── MESSAGE CREATE ────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // XP
  await handleMessageXP(message);

  // Rotating channel activity tracking
  if (message.channelId === ROTATING_MESSAGE.channelId)
    rotatingChannelLastActivity = Date.now();

  // Auto-react
  if (AUTO_REACT_CHANNEL_IDS.includes(message.channelId))
    await message.react('❤️').catch(() => null);

  // Sticky messages
  const stickyCfg = STICKY_MESSAGES.find(s => s.channelId === message.channelId);
  if (stickyCfg) {
    try {
      const oldId = stickyCache.get(message.channelId);
      if (oldId) {
        const old = await message.channel.messages.fetch(oldId).catch(() => null);
        if (old) await old.delete().catch(() => null);
      }
      const embed = new EmbedBuilder().setColor(EMBED_COLOR)
        .setTitle(stickyCfg.title).setDescription(stickyCfg.description);
      const sent = await message.channel.send({ embeds: [embed] });
      stickyCache.set(message.channelId, sent.id);
    } catch (err) { console.error('[Sticky]', err); }
  }

  // Keyword replies
  const lower = message.content.toLowerCase();
  for (const entry of KEYWORD_REPLIES) {
    const matched = entry.keywords.find(kw => lower.includes(kw.toLowerCase()));
    if (!matched) continue;
    const key     = entry.keywords[0];
    const lastSent = keywordCooldowns.get(key) || 0;
    if (Date.now() - lastSent < KEYWORD_COOLDOWN_MS) break;
    await message.reply({ content: entry.reply, allowedMentions: { repliedUser: false } }).catch(() => null);
    keywordCooldowns.set(key, Date.now());
    break;
  }
});

// ─── THREAD AUTO-MESSAGES ──────────────────────────────────────────────────────
client.on('threadCreate', async (thread) => {
  // Thread Master achievement — any thread created inside the achievement category
  if (thread.parent?.parentId === THREAD_ACHIEVEMENT_CATEGORY || thread.parentId === THREAD_ACHIEVEMENT_CATEGORY) {
    const ownerId = thread.ownerId;
    if (ownerId) await grantAchievement(ownerId, 'thread_master', thread.guild);
  }

  const cfg = THREAD_AUTO_MESSAGES.find(t => t.parentChannelId === thread.parentId);
  if (!cfg) return;
  try {
    await new Promise(r => setTimeout(r, 1000));
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(cfg.title).setDescription(cfg.description);
    const row   = new ActionRowBuilder().addComponents(
      ...cfg.buttons.map(b => new ButtonBuilder().setLabel(b.label).setURL(b.url).setStyle(ButtonStyle.Link))
    );
    await thread.send({ embeds: [embed], components: [row] });
  } catch (err) { console.error('[Thread]', err); }
});

// ─── XP LOGIC ─────────────────────────────────────────────────────────────────
async function handleMessageXP(message) {
  if (!message.guild) return;
  const userId = message.author.id;
  const now    = Date.now();

  // 60s cooldown per user (same as Mee6/Arcane)
  if (now - (xpCooldowns.get(userId) || 0) < MSG_COOLDOWN_MS) return;
  xpCooldowns.set(userId, now);

  // Natural XP: 15–40 base + small length bonus, capped
  let xp = calculateMessageXP(message.content);

  // 2× in bonus channels
  if (DOUBLE_XP_CHANNEL_IDS.includes(message.channelId)) xp *= 2;

  // 2× if currently in a VC
  if (message.member?.voice?.channelId) xp *= 2;

  console.log(`[XP] +${Math.floor(xp)} to ${userId}`);
  await grantXP(userId, Math.floor(xp), message.guild, message.channel);

  // Achievement: first message in specific channels
  await checkChannelAchievement(userId, message.channelId, message.guild);
}

async function grantXP(userId, amount, guild, notifyChannel) {
  const data   = getUserData(userId);
  const before = parseLevelData(data.xp || 0);
  data.xp      = (data.xp || 0) + amount;
  const after  = parseLevelData(data.xp);
  data.level   = after.level;
  saveXpData();

  if (after.level > before.level) {
    for (let lvl = before.level + 1; lvl <= after.level; lvl++) {
      await handleLevelUp(userId, lvl, guild, notifyChannel);
      await checkLevelAchievements(userId, lvl, guild);
    }
  }
}

async function handleLevelUp(userId, newLevel, guild, notifyChannel) {
  // 1. Assign milestone role if applicable
  const roleId = LEVEL_ROLES[newLevel];
  if (guild && roleId) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        for (const rid of Object.values(LEVEL_ROLES)) {
          if (rid !== roleId && member.roles.cache.has(rid))
            await member.roles.remove(rid).catch(() => null);
        }
        await member.roles.add(roleId).catch(() => null);
        console.log(`[XP] Role ${roleId} → ${userId} at level ${newLevel}`);
      }
    } catch (err) { console.error('[XP] Role error:', err); }
  }

  // 2. Only send a message at level 1 (first level up) and milestone levels
  const isMilestone = MILESTONE_LEVELS.includes(newLevel);
  const isFirstLevel = newLevel === 1;
  if (!isMilestone && !isFirstLevel) return;

  const channel = notifyChannel || guild?.systemChannel;
  if (!channel) return;

  const nextMilestone = MILESTONE_LEVELS.find(m => m > newLevel);

  let msg;
  if (isFirstLevel && !isMilestone) {
    msg = `<@${userId}> has reached level **1**. Welcome to the ranks! 🎉`;
  } else if (isMilestone) {
    msg = nextMilestone
      ? `<@${userId}> has reached level **${newLevel}**! 🏆 Milestone unlocked — next milestone: level **${nextMilestone}**`
      : `<@${userId}> has reached level **${newLevel}**! 🏆 You've hit the top — absolute legend!`;
  }

  channel.send(msg).catch(err => console.error('[XP] Level-up send error:', err));
}

// ─── VOICE XP TICKER ──────────────────────────────────────────────────────────
// 10 XP every 30 s = 20 XP/min in VC — equivalent to a message every ~1 min
// Level-up notifications go to the guild's system channel
const VC_XP_INTERVAL_MS = 30 * 1000;
const VC_XP_AMOUNT      = 10;

function startVcXpTicker() {
  setInterval(async () => {
    try {
      for (const [, guild] of client.guilds.cache) {
        for (const [, vs] of guild.voiceStates.cache) {
          if (!vs.channelId)                    continue;
          if (!vs.member || vs.member.user.bot) continue;
          if (vs.selfDeaf || vs.suppress)       continue;
          const ch = vs.channel;
          if (!ch) continue;
          // Require at least 1 other non-bot member (anti-grind)
          if (ch.members.filter(m => !m.user.bot && m.id !== vs.id).size < 1) continue;
          // Level-up messages go to system channel so they don't spam random channels
          await grantXP(vs.id, VC_XP_AMOUNT, guild, guild.systemChannel);
        }
      }
    } catch (err) { console.error('[VC XP]', err); }
  }, VC_XP_INTERVAL_MS);
  console.log('[VC XP] Ticker started (30 s, 10 XP/tick)');
}

// ─── TICKET HELPERS ────────────────────────────────────────────────────────────
const TICKET_TYPE_CONFIG = {
  ticket_report:       { prefix: 'report',           title: 'Report',           welcome: 'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.\n\nTo make this the easiest possible process, please describe your issue in as much detail as possible, include who you are reporting, screenshots, etc.' },
  ticket_claim_client: { prefix: 'claim-client-role', title: 'Claim Client Role', welcome: 'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.' },
  ticket_questions:    { prefix: 'questions',         title: 'Questions',         welcome: 'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.\n\nTo make this the easiest possible process, please let us know any questions you may have now!' },
};

async function createTicket(interaction, type) {
  const guild  = interaction.guild;
  const member = interaction.member;
  const cfg    = TICKET_TYPE_CONFIG[type];
  if (!cfg) return;

  const existing = guild.channels.cache.find(
    c => c.parentId === TICKET_CATEGORY_ID && c.topic && c.topic.endsWith(`:${member.user.id}`)
  );
  if (existing)
    return interaction.reply({ content: `<:ex:1497525479593476197> You already have an open ticket: <#${existing.id}>`, ephemeral: true });

  await interaction.deferReply({ ephemeral: true });
  try {
    const ch = await guild.channels.create({
      name:   `${cfg.prefix}-${member.user.id}`,
      type:   ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      topic:  `${type}:${member.user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: TICKET_STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles] },
      ],
    });
    const embed  = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(cfg.title).setDescription(cfg.welcome).setTimestamp();
    const row    = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
    );
    const msg = await ch.send({ content: `<@${member.user.id}>`, embeds: [embed], components: [row] });
    await msg.pin().catch(() => null);
    await interaction.editReply({ content: `<:tick:1497525507015708692> Your ticket has been created: <#${ch.id}>` });
  } catch (err) {
    console.error('[Ticket] Create error:', err);
    await interaction.editReply({ content: '<:ex:1497525479593476197> Failed to create ticket.' });
  }
}

async function closeTicket(interaction) {
  const ch = interaction.channel;
  if (ch.parentId !== TICKET_CATEGORY_ID)
    return interaction.reply({ content: '<:ex:1497525479593476197> Not a ticket channel.', ephemeral: true });

  const canClose = interaction.member.roles?.cache?.has(TICKET_CLOSE_ROLE_ID) || interaction.user.id === OWNER_ID;
  if (!canClose)
    return interaction.reply({ content: "<:ex:1497525479593476197> You don't have permission to close tickets.", ephemeral: true });

  await interaction.reply({ content: '<a:loading:1479510452215218197> Closing in 5 seconds…' });
  setTimeout(() => ch.delete().catch(err => console.error('[Ticket] Close error:', err)), 5000);
}

// ─── INTERACTIONS ──────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {

  // ── Modal submissions ──
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'question_modal') {
      const text = interaction.fields.getTextInputValue('question_input');
      try {
        const inboxCh = await client.channels.fetch(QUESTIONS_INBOX_CHANNEL_ID).catch(() => null);
        if (!inboxCh)
          return interaction.reply({ content: '<:ex:1497525479593476197> Questions channel not found.', ephemeral: true });
        const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Anonymous Question').setDescription(text).setTimestamp();
        const delRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('question_delete').setLabel('✕').setStyle(ButtonStyle.Danger)
        );
        await inboxCh.send({ embeds: [embed], components: [delRow] });
        await interaction.reply({ content: '<:tick:1497525507015708692> Your question has been submitted anonymously!', ephemeral: true });
      } catch (err) {
        console.error('[Question] Submit error:', err);
        await interaction.reply({ content: '<:ex:1497525479593476197> Failed to submit.', ephemeral: true });
      }
    }
    return;
  }

  // ── Button interactions ──
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (['ticket_report', 'ticket_claim_client', 'ticket_questions'].includes(customId))
      return createTicket(interaction, customId);
    if (customId === 'ticket_close')
      return closeTicket(interaction);
    if (customId === 'submit_question') {
      const modal = new ModalBuilder().setCustomId('question_modal').setTitle('Submit a Question');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('question_input').setLabel('Your question')
          .setStyle(TextInputStyle.Paragraph).setPlaceholder('Type your question here…').setRequired(true).setMaxLength(1000)
      ));
      return interaction.showModal(modal);
    }
    if (customId === 'question_delete') {
      const canDel = CLIENT_ROLE_IDS.some(id => interaction.member.roles?.cache?.has(id)) || interaction.user.id === OWNER_ID;
      if (!canDel) return interaction.reply({ content: "<:ex:1497525479593476197> No permission.", ephemeral: true });
      await interaction.message.delete().catch(() => null);
      return;
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    // ── /eval ──
    if (interaction.commandName === 'eval') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try {
        let result = eval(interaction.options.getString('code'));
        if (result instanceof Promise) result = await result;
        await interaction.editReply({ content: `\`\`\`js\n${util.inspect(result, { depth: 2 }).slice(0, 1900)}\n\`\`\`` });
      } catch (e) {
        await interaction.editReply({ content: `\`\`\`js\n${String(e).slice(0, 1900)}\n\`\`\`` });
      }

    // ── /info ──
    } else if (interaction.commandName === 'info') {
      await interaction.deferReply();
      const { guild } = interaction;
      await guild.fetch();
      const s = Math.floor(client.uptime / 1000);
      const uptime = `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m`;
      await interaction.editReply({ embeds: [
        new EmbedBuilder().setColor(EMBED_COLOR).setTitle('🤖 Bot Info')
          .addFields(
            { name: 'Tag',    value: client.user.tag,  inline: true },
            { name: 'Uptime', value: uptime,           inline: true },
            { name: 'Ping',   value: `${client.ws.ping}ms`, inline: true }
          ).setThumbnail(client.user.displayAvatarURL()),
        new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`📊 ${guild.name}`)
          .addFields(
            { name: 'Members',  value: `${guild.memberCount}`,          inline: true },
            { name: 'Channels', value: `${guild.channels.cache.size}`,  inline: true },
            { name: 'Roles',    value: `${guild.roles.cache.size}`,     inline: true },
            { name: 'Owner',    value: `<@${guild.ownerId}>`,           inline: true },
            { name: 'Created',  value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`, inline: true }
          ).setThumbnail(guild.iconURL({ dynamic: true })),
      ]});

    // ── /embed ──
    } else if (interaction.commandName === 'embed') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const ch         = interaction.options.getChannel('channel');
      const content    = interaction.options.getString('content') ?? undefined;
      const imageUrl   = interaction.options.getString('image_url');
      const title      = interaction.options.getString('title');
      const desc       = interaction.options.getString('description')?.replace(/\\n/g, '\n');
      const colorRaw   = interaction.options.getString('color');
      const color      = colorRaw ? parseInt(colorRaw.replace('#',''), 16) || EMBED_COLOR : EMBED_COLOR;
      const footer     = interaction.options.getString('footer');
      const footerIcon = interaction.options.getString('footer_icon');
      const embedImg   = interaction.options.getString('image');
      const thumb      = interaction.options.getString('thumbnail');
      const author     = interaction.options.getString('author');
      const authorIcon = interaction.options.getString('author_icon');
      const authorUrl  = interaction.options.getString('author_url');
      const buttonsRaw = interaction.options.getString('buttons');
      const ts         = interaction.options.getBoolean('timestamp');
      const embeds = [];
      if (title || desc || footer || embedImg || thumb || author) {
        const e = new EmbedBuilder().setColor(color);
        if (title)     e.setTitle(title);
        if (desc)      e.setDescription(desc);
        if (footer)    e.setFooter({ text: footer, iconURL: footerIcon ?? undefined });
        if (embedImg)  e.setImage(embedImg);
        if (thumb)     e.setThumbnail(thumb);
        if (author)    e.setAuthor({ name: author, iconURL: authorIcon ?? undefined, url: authorUrl ?? undefined });
        if (ts)        e.setTimestamp();
        embeds.push(e);
      }
      if (!content && !embeds.length && !imageUrl)
        return interaction.editReply({ content: '<:ex:1497525479593476197> Nothing to send!' });
      const components = buttonsRaw ? buildButtonRows(buttonsRaw) : [];
      const files = [];
      if (imageUrl) {
        try {
          const buf = await downloadBuffer(imageUrl);
          const ext = imageUrl.split('?')[0].split('.').pop().split('/').pop().toLowerCase() || 'png';
          files.push(new AttachmentBuilder(buf, { name: `image.${ext}` }));
        } catch (e) {
          return interaction.editReply({ content: `<:ex:1497525479593476197> Failed to download image: \`${e.message}\`` });
        }
      }
      try {
        await ch.send({ content, embeds, components, files });
        await interaction.editReply({ content: `<:tick:1497525507015708692> Sent to <#${ch.id}>!` });
      } catch (e) {
        await interaction.editReply({ content: `<:ex:1497525479593476197> Failed: \`${e.message}\`` });
      }

    // ── /verify ──
    } else if (interaction.commandName === 'verify') {
      if (!interaction.member.roles?.cache?.has('1462396655558201365'))
        return interaction.reply({ content: "<:ex:1497525479593476197> No permission.", ephemeral: true });
      const targetUser   = interaction.options.getUser('member');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember)
        return interaction.reply({ content: '<:ex:1497525479593476197> Member not found.', ephemeral: true });
      try {
        await targetMember.roles.add('1442822567525224448');
        await interaction.reply({ content: `<:tick:1497525507015708692> <@${targetUser.id}> has been verified!` });
      } catch (err) {
        await interaction.reply({ content: '<:ex:1497525479593476197> Failed to assign role.', ephemeral: true });
      }

    // ── /link ──
    } else if (interaction.commandName === 'link') {
      const entry = LINK_OPTIONS.find(l => l.value === interaction.options.getString('product'));
      if (!entry) return interaction.reply({ content: '<:ex:1497525479593476197> Unknown product.', ephemeral: true });
      const btn = new ButtonBuilder().setLabel(`🔗 ${entry.name}`).setURL(entry.url).setStyle(ButtonStyle.Link);
      await interaction.reply({ content: entry.url, components: [new ActionRowBuilder().addComponents(btn)] });

    // ── /tickets ──
    } else if (interaction.commandName === 'tickets') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Create a Support Ticket')
        .setDescription('To get support, click the corresponding button below.\n\nThis will create a private ticket where our team can assist you directly.\n\nPlease only open a ticket for a valid reason so we can respond quickly and efficiently.');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_report').setLabel('📋 Report').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_claim_client').setLabel('🏅 Claim Client Role').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_questions').setLabel('❓ Questions').setStyle(ButtonStyle.Secondary),
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '<:tick:1497525507015708692> Ticket panel sent.', ephemeral: true });

    // ── /question ──
    } else if (interaction.commandName === 'question') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      const embed = new EmbedBuilder().setColor(EMBED_COLOR)
        .setDescription("Have a question but prefer to stay behind the scenes?\n\nYou can submit it anonymously by clicking *\"Submit a Question\"* below.\n\nAll submissions are anonymous, and we'll address them during our weekly calls.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('submit_question').setLabel('Submit a Question').setStyle(ButtonStyle.Secondary)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '<:tick:1497525507015708692> Question panel sent.', ephemeral: true });

    // ── /add ──
    } else if (interaction.commandName === 'add') {
      const hasRole = CLIENT_ROLE_IDS.some(id => interaction.member.roles?.cache?.has(id)) || interaction.user.id === OWNER_ID;
      if (!hasRole) return interaction.reply({ content: "<:ex:1497525479593476197> No permission.", ephemeral: true });
      if (interaction.channel.parentId !== TICKET_CATEGORY_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not a ticket channel.', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      try {
        await interaction.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.reply({ content: `<:tick:1497525507015708692> <@${targetUser.id}> added.` });
      } catch (err) {
        await interaction.reply({ content: '<:ex:1497525479593476197> Failed.', ephemeral: true });
      }

    // ── /remove ──
    } else if (interaction.commandName === 'remove') {
      const hasRole = CLIENT_ROLE_IDS.some(id => interaction.member.roles?.cache?.has(id)) || interaction.user.id === OWNER_ID;
      if (!hasRole) return interaction.reply({ content: "<:ex:1497525479593476197> No permission.", ephemeral: true });
      if (interaction.channel.parentId !== TICKET_CATEGORY_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not a ticket channel.', ephemeral: true });
      const targetUser = interaction.options.getUser('user');
      if (interaction.channel.topic?.endsWith(`:${targetUser.id}`))
        return interaction.reply({ content: '<:ex:1497525479593476197> Cannot remove the ticket owner.', ephemeral: true });
      try {
        await interaction.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false });
        await interaction.reply({ content: `<:tick:1497525507015708692> <@${targetUser.id}> removed.` });
      } catch (err) {
        await interaction.reply({ content: '<:ex:1497525479593476197> Failed.', ephemeral: true });
      }

    // ── /achievements ──
    } else if (interaction.commandName === 'achievements') {
      const target  = interaction.options.getUser('member') || interaction.user;
      const isSelf  = target.id === interaction.user.id;
      const earned  = getUserAch(target.id);
      const member  = await interaction.guild.members.fetch(target.id).catch(() => null);
      const display = member?.displayName || target.username;

      const lines = ACHIEVEMENTS.map(a => {
        const has = earned.has(a.id);
        return has
          ? `${a.emoji} **${a.name}** — ${a.description}`
          : `🔒 ~~${a.name}~~ — *Not yet unlocked*`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: `${display}'s Achievements`, iconURL: target.displayAvatarURL({ extension: 'png' }) })
        .setDescription(lines.join('\n'))
        .setFooter({ text: `${earned.size} / ${ACHIEVEMENTS.length} unlocked` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    // ── /level ──
    } else if (interaction.commandName === 'level') {
      // Defer FIRST — before any async work — Discord requires acknowledgement within 3s
      await interaction.deferReply({ ephemeral: true });

      const target  = interaction.options.getUser('member') || interaction.user;
      const data    = getUserData(target.id);
      const { level, currentXP, neededXP } = parseLevelData(data.xp || 0);
      const totalXP = data.xp || 0;

      const sorted   = Object.entries(xpData).sort(([,a],[,b]) => (b.xp||0) - (a.xp||0));
      const rankIdx  = sorted.findIndex(([id]) => id === target.id);
      const rank     = rankIdx === -1 ? sorted.length + 1 : rankIdx + 1;

      const member    = await interaction.guild.members.fetch(target.id).catch(() => null);
      const username  = member?.displayName || target.username;
      // Use smaller avatar size and add ?size param to speed up fetch
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 128 });

      try {
        const buf = await drawRankCard({
          username, avatarUrl, level, rank,
          currentXP, neededXP, totalXP,
          guildName: interaction.guild.name,
        });
        await interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'rank.png' })] });
      } catch (err) {
        console.error('[/level] card error:', err.message);
        // Always fall back to text so the interaction isn't left hanging
        await interaction.editReply({
          content: `**${username}** — Level **${level}** · Rank **#${rank}** · **${totalXP.toLocaleString()} XP**`,
        }).catch(() => null);
      }

    // ── /leaderboard ──
    } else if (interaction.commandName === 'leaderboard') {
      // Defer FIRST
      await interaction.deferReply({ ephemeral: true });

      const sorted = Object.entries(xpData)
        .sort(([,a],[,b]) => (b.xp||0) - (a.xp||0))
        .slice(0, 10);

      if (!sorted.length) {
        return interaction.editReply({ content: 'No XP data yet!' });
      }

      // Fetch members sequentially to avoid hammering Discord's API
      const entries = [];
      for (const [userId, d] of sorted) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const user   = member?.user || await client.users.fetch(userId).catch(() => null);
        const { level, currentXP, neededXP } = parseLevelData(d.xp || 0);
        entries.push({
          username:  member?.displayName || user?.username || 'Unknown',
          avatarUrl: user?.displayAvatarURL({ extension: 'png', size: 64 }) || '',
          level, totalXP: d.xp || 0, currentXP, neededXP,
        });
      }

      try {
        const buf = await drawLeaderboard(entries);
        await interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'leaderboard.png' })] });
      } catch (err) {
        console.error('[/leaderboard]', err);
        const lines = entries.map((e, i) => `**${i+1}.** ${e.username} — Lv ${e.level} · ${e.totalXP.toLocaleString()} XP`);
        await interaction.editReply({ content: lines.join('\n') });
      }

    // ── /givexp ──
    } else if (interaction.commandName === 'givexp') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      const target = interaction.options.getUser('member');
      const amount = interaction.options.getInteger('amount');
      await grantXP(target.id, amount, interaction.guild, interaction.channel);
      const { level } = parseLevelData(getUserData(target.id).xp || 0);
      await interaction.reply({
        content: `<:tick:1497525507015708692> Gave **${amount} XP** to <@${target.id}>. Now level **${level}** (${(getUserData(target.id).xp||0).toLocaleString()} XP).`,
        ephemeral: true,
      });

    // ── /setlevel ──
    } else if (interaction.commandName === 'setlevel') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:ex:1497525479593476197> Not authorised.', ephemeral: true });
      const target   = interaction.options.getUser('member');
      const newLevel = interaction.options.getInteger('level');
      const data     = getUserData(target.id);
      const oldLevel = parseLevelData(data.xp || 0).level;
      data.xp    = totalXPForLevel(newLevel);
      data.level = newLevel;
      saveXpData();

      // Assign correct milestone role
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) {
        const milestone = [...MILESTONE_LEVELS].reverse().find(m => m <= newLevel);
        for (const [lvl, rid] of Object.entries(LEVEL_ROLES)) {
          const shouldHave = milestone && Number(lvl) === milestone;
          if (shouldHave && !member.roles.cache.has(rid)) await member.roles.add(rid).catch(() => null);
          if (!shouldHave && member.roles.cache.has(rid)) await member.roles.remove(rid).catch(() => null);
        }
      }

      await interaction.reply({
        content: `<:tick:1497525507015708692> Set <@${target.id}>'s level to **${newLevel}** (was ${oldLevel}). XP: **${data.xp.toLocaleString()}**.`,
        ephemeral: true,
      });
    }

  } catch (err) {
    console.error(`[Command] /${interaction.commandName}:`, err);
    // Interaction may already be expired — try every possible reply method
    const m = { content: '<:ex:1497525479593476197> An error occurred.', ephemeral: true };
    try {
      if (interaction.deferred || interaction.replied) await interaction.editReply(m);
      else await interaction.reply(m);
    } catch { /* interaction expired — nothing we can do */ }
  }
});

// ─── ERROR HANDLING ────────────────────────────────────────────────────────────
client.on('error', err => console.error('[Client]', err));
process.on('unhandledRejection', err => console.error('[Unhandled]', err));
process.on('uncaughtException',  err => console.error('[Uncaught]',  err));

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
console.log('━━━ Ascend Bot startup ━━━');
console.log('  NODE_ENV:      ', process.env.NODE_ENV || '(not set)');
console.log('  TOKEN set:     ', !!process.env.DISCORD_TOKEN);
console.log('  TOKEN prefix:  ', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.slice(0, 10) + '...' : 'N/A');
console.log('  CLIENT_ID:     ', process.env.CLIENT_ID || '(not set)');
console.log('  GUILD_ID:      ', process.env.GUILD_ID  || '(not set — global cmds)');
console.log('  JSONBIN_KEY:   ', JSONBIN_KEY  ? '✓ set' : '✗ MISSING');
console.log('  XP_BIN_ID:     ', XP_BIN_ID   ? '✓ set' : '✗ MISSING');
console.log('  ACH_BIN_ID:    ', ACH_BIN_ID  ? '✓ set' : '✗ MISSING');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━');

if (!process.env.DISCORD_TOKEN) {
  console.error('[Bot] DISCORD_TOKEN not set — exiting');
  process.exit(1);
}

// Rate limit logging
client.rest.on('rateLimited', info => {
  console.warn('[RATE LIMITED]', JSON.stringify(info));
});

client.on('error', err => console.error('[Client error]', err));
client.on('warn',  msg => console.warn('[Client warn]',  msg));
client.on('shardError', err => console.error('[Shard error]', err));

console.log('[Bot] Calling client.login()...');
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('[Bot] client.login() resolved OK'))
  .catch(err => {
    console.error('[Bot] Login FAILED:', err.message);
    console.error('[Bot] Error code:', err.code);
    console.error('[Bot] Full error:', err);
    process.exit(1);
  });
