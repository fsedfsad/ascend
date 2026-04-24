# Ascend Bot

Discord bot for the Ascend community. Handles levelling, achievements, tickets, sticky messages, keyword replies, and more.

---

## Folder Structure

```
ascend-bot/
├── index.js              ← Main bot file (everything lives here)
├── package.json          ← Dependencies
├── render.yaml           ← Render.com deployment config
├── .env.example          ← Copy to .env for local development
├── .gitignore
├── README.md
└── fonts/
    ├── inter-bold.ttf        ← Required for rank/leaderboard cards
    ├── inter-semibold.ttf
    └── inter-regular.ttf
```

> `xp_data.json` and `achievements.json` are created automatically at runtime.  
> On Render they live on the persistent disk (`/data`). Locally they sit next to `index.js`.

---

## Local Development

1. **Clone / download** the repo
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create your `.env`** by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Then fill in your values.

4. **Run the bot**
   ```bash
   npm start
   ```

---

## Render.com Deployment

1. Push this folder to a **GitHub repo**
2. In [Render](https://render.com), create a new **Web Service** and connect the repo
3. Render will detect `render.yaml` automatically and:
   - Set the build command to `npm install`
   - Set the start command to `node index.js`
   - Provision a **1 GB persistent disk** at `/data` for XP and achievement data
4. In the Render dashboard → **Environment**, add these variables:
   | Key | Value |
   |-----|-------|
   | `DISCORD_TOKEN` | Your bot token |
   | `CLIENT_ID` | Your application client ID |
   | `GUILD_ID` | Your server ID |
   | `DATA_PATH` | `/data` (already set by render.yaml) |

5. Deploy — the bot will start and register slash commands automatically.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Application ID from Discord Developer Portal |
| `GUILD_ID` | ✅ | Your server ID (for fast command registration) |
| `DATA_PATH` | ✅ on Render | Path to persistent disk. Set to `/data` on Render |
| `PORT` | ❌ | HTTP port for keep-alive server. Render sets this automatically |

---

## Bot Permissions Required

When inviting the bot, make sure it has:
- `Manage Roles` — for assigning level milestone roles
- `Manage Channels` — for creating and closing tickets
- `Send Messages` / `Read Message History`
- `Manage Messages` — for sticky messages and pinning
- `View Channels`

Permission integer: `8` (Administrator) is easiest for a private server.

---

## XP System

- **15–40 XP** per message, once per 60 seconds (exact Mee6 formula)
- **2× XP** in the wins channel and testimonials channel
- **2× XP** while in a voice channel (stacks with channel bonus)
- **+10 XP** every 30 seconds while in a VC with at least 1 other member

### Milestone levels & roles

| Level | Role ID |
|-------|---------|
| 5 | `1465937177883181166` |
| 10 | `1465937430661042329` |
| 20 | `1465937503889657992` |
| 30 | `1465937567789744128` |
| 40 | `1465937603198189600` |
| 50 | `1465937635267575909` |
| 70 | `1465937799546015928` |
| 80 | `1465937866671784099` |
| 100 | `1465937932870484143` |

### Time to reach milestones

| Level | Regular (~20 XP/msg) | Double XP (~40 XP/msg) |
|-------|---------------------|------------------------|
| 1 | 5 messages | 3 messages |
| 5 | ~58 messages (~1h) | ~29 messages |
| 10 | ~234 messages (~4h) | ~117 messages (~2h) |
| 20 | ~1,193 messages (~20h) | ~597 messages (~10h) |
| 30 | ~3,377 messages (~56h) | ~1,689 messages (~28h) |
| 50 | ~13,419 messages (~224h) | ~6,710 messages (~112h) |
| 100 | ~94,963 messages (~1,583h) | ~47,482 messages (~791h) |

*Based on 1 message per minute of active chatting.*

---

## Slash Commands

| Command | Who | Description |
|---------|-----|-------------|
| `/level [member]` | Everyone | View rank card |
| `/leaderboard` | Everyone | Top 10 XP leaderboard |
| `/achievements [member]` | Everyone | View achievements |
| `/givexp <member> <amount>` | Owner only | Grant XP |
| `/setlevel <member> <level>` | Owner only | Set a member's level |
| `/tickets` | Owner only | Post ticket panel |
| `/question` | Owner only | Post anonymous question panel |
| `/embed` | Owner only | Send a custom embed |
| `/link <product>` | Everyone | Post an affiliate link |
| `/verify <member>` | Staff | Verify a member |
| `/add <user>` | Staff | Add user to ticket |
| `/remove <user>` | Staff | Remove user from ticket |
| `/info` | Everyone | Bot and server info |

---

## Achievements

| Achievement | Trigger |
|-------------|---------|
| 📝 Testimonial | First message in testimonials channel |
| 👋 Hello World | First message in introductions channel |
| 🏆 First Win | First message in wins channel |
| 🧵 Thread Master | Created a thread in the community |
| 💪 Daily Grind | First message in daily check-in channel |
| ⭐ Rising Star | Reached level 5 |
| 🌟 Committed | Reached level 10 |
| 💫 Dedicated | Reached level 20 |
| 🔥 On Fire | Reached level 50 |
| 👑 Legend | Reached level 100 |

Users are DM'd an embed the moment they unlock any achievement.
