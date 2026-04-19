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
const util = require('util');
const https = require('https');
const http = require('http');

// ─── EXPRESS SERVER ────────────────────────────────────────────────────────────
const app = express();
app.get('/', (_req, res) => res.send('Ascend Bot is alive! 🤖'));
app.listen(process.env.PORT || 3000, () =>
  console.log(`[Server] Running on port ${process.env.PORT || 3000}`)
);

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const EMBED_COLOR = 0x242429;
const OWNER_ID = '1443949062952058995';
const GHOST_PING_CHANNEL_ID = '1462389865382547621';

// Role IDs allowed to use /client, /add, /remove, and close tickets
const CLIENT_ROLE_IDS = ['1462396655558201365', '1448123817338867832'];
// The staff role that can close tickets (only this role + owner)
const TICKET_CLOSE_ROLE_ID = '1462396655558201365';

// Channels that get auto ❤️ react
const AUTO_REACT_CHANNEL_IDS = [
  '1462389447650967744', // #testimonials
  '1429961951097651261', // #wins
  '1462396052266156135', // #introductions
];

// Keyword → reply map with 5-minute cooldown per keyword
const KEYWORD_REPLIES = [
  { keywords: ['glass container', 'glass containers'], reply: 'https://amzn.to/4kdIdDa' },
  { keywords: ['walking pad'], reply: 'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_apin_aipsfshop_F4YD211TGMS366HYB7D7_1&language=en-US' },
  { keywords: ['ehp', 'protein powder', 'preworkout', 'pre workout', 'creatine', 'oxyshred', 'whey'], reply: 'https://ehplabs.com.au/discount/ANABOLIC' },
  { keywords: ['grips'], reply: 'https://www.versagripps.com/gabrielchenkov-shaw' },
  { keywords: ['vitamins', 'nattyplus', 'natty plus'], reply: 'https://nattyplussupps.com/anabolic' },
];
const keywordCooldowns = new Map();
const KEYWORD_COOLDOWN_MS = 5 * 60 * 1000;

// /link choices
const LINK_OPTIONS = [
  { name: 'Walking Pad', value: 'walkingpad', url: 'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_apin_aipsfshop_F4YD211TGMS366HYB7D7_1&language=en-US' },
  { name: 'EHP Labs', value: 'ehp', url: 'https://ehplabs.com.au/discount/ANABOLIC' },
  { name: 'Natty Plus', value: 'nattyplus', url: 'https://nattyplussupps.com/anabolic' },
  { name: 'Versa Gripps', value: 'versa', url: 'https://www.versagripps.com/gabrielchenkov-shaw' },
  { name: 'Glass Container', value: 'glasscontainer', url: 'https://amzn.to/4kdIdDa' },
];

// Ticket system config
const TICKET_CATEGORY_ID = '1478617294648115423';
const TICKET_STAFF_ROLE_ID = '1462396655558201365';

// Anonymous questions inbox channel
const QUESTIONS_INBOX_CHANNEL_ID = '1463809063157629044';

const STICKY_MESSAGES = [
  {
    channelId: '1429961951097651261',
    title: 'Get Featured on the Ascend Instagram',
    description:
      "If you would like your win featured, tag @ascendperformance.au on your post or story and we'll repost it!\n\nhttps://www.instagram.com/ascendperformance.au/",
  },
  {
    channelId: '1462396052266156135',
    title: 'Unsure how to start? Try this:',
    description:
      '* Share a picture of yourself\n* Name & Country\n* Achievements + Future Goals\n* Social Platforms (only allowed in this channel)\n\nFor the best community experience, we suggest you change your nickname to your IRL name, and an appropriate profile picture!',
  },
  {
    channelId: '1462389447650967744',
    title: 'You can find more of our testimonials here:',
    description: 'https://www.anabolic.au/',
  },
];

// Rotating message — only sends if someone typed in that channel in the past hour
const ROTATING_MESSAGE = {
  channelId: '1471066886031540349',
  intervalMs: 60 * 60 * 1000,
  title: 'Gabes Amazon Storefront',
  description:
    'Check out Gabes Amazon storefront featuring products he personally uses day to day. From walking pads and content creation kits to cooking essentials, recovery tools, and sleep maxxing gear — everything is hand-picked to support performance, productivity, and health.',
  buttonLabel: '🛒 View Store',
  buttonUrl: 'https://www.amazon.com.au/shop/anabolic_gabe?ref_=cm_sw_r_cp_ud_aipsfshop_TANG1M7CGF6JP95F6ERR',
};

const THREAD_AUTO_MESSAGES = [
  {
    parentChannelId: '1471068205404520469',
    title: 'Natty Plus Supplements & EHP Labs',
    description:
      "Natty Plus Supplements and EHP Labs are raising the standard for serious training. Natty Plus Supplements delivers premium products built for lifters who care about quality, transparency, and results. EHP Labs is known globally for clinically dosed formulas like OxyShred and Beyond BCAA - designed to support performance, recovery, and body composition without the fluff.\nIf you're training with intent, fuel yourself with brands that do the same. Precision in. Power out.",
    buttons: [
      { label: '🔥 EHP Labs', url: 'https://ehplabs.com.au/discount/ANABOLIC' },
      { label: '💊 Natty Plus', url: 'https://nattyplussupps.com/anabolic' },
    ],
  },
  {
    parentChannelId: '1465489677762039838',
    title: 'Versa Gripps',
    description:
      "Engineered for serious lifters, Versa Gripps provide fast, secure wrist support and a locked-in hold on the bar - no awkward wrapping, no wasted time between sets. Whether you're pulling heavy deadlifts, grinding through rows, or pushing your back days harder than ever, they let you focus on the target muscle instead of fighting your grip.\n\nTrain stronger. Lift longer. Remove the weak link.",
    buttons: [
      {
        label: '🛒 Shop Versa Gripps',
        url: 'https://www.versagripps.com/?sca_ref=8008738.NxqfWnUjps&utm_source=affiliate&utm_medium=versa-gripps-affiliate-program&utm_campaign=8008738',
      },
    ],
  },
];

// ─── CLIENT ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction],
});

const stickyCache = new Map();
let rotatingMessageId = null;
let rotatingChannelLastActivity = 0;

// ─── HELPER: build URL button rows ────────────────────────────────────────────
function buildButtonRows(buttonsRaw) {
  const parts = buttonsRaw.split('|').map((s) => s.trim());
  const btns = [];
  for (let i = 0; i + 1 < parts.length; i += 2)
    if (parts[i] && parts[i + 1])
      btns.push(new ButtonBuilder().setLabel(parts[i]).setURL(parts[i + 1]).setStyle(ButtonStyle.Link));

  const rows = [];
  for (let i = 0; i < btns.length && i < 15; i += 5)
    rows.push(new ActionRowBuilder().addComponents(...btns.slice(i, i + 5)));
  return rows;
}

// ─── HELPER: download URL into Buffer ─────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── READY ─────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    const cmds = [
      // /eval
      new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript (owner only)')
        .addStringOption((o) => o.setName('code').setDescription('Code to run').setRequired(true)),

      // /info
      new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display server and bot info'),

      // /embed
      new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a message or embed (owner only)')
        .addChannelOption((o) => o.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption((o) => o.setName('content').setDescription('Plain text content (works without an embed)'))
        .addStringOption((o) => o.setName('image_url').setDescription('Image URL to attach as a file in the message'))
        .addStringOption((o) => o.setName('title').setDescription('Embed title'))
        .addStringOption((o) => o.setName('description').setDescription('Embed description (use \\n for newlines)'))
        .addStringOption((o) => o.setName('color').setDescription('Hex colour e.g. #ff0000'))
        .addStringOption((o) => o.setName('footer').setDescription('Footer text'))
        .addStringOption((o) => o.setName('footer_icon').setDescription('Footer icon URL'))
        .addStringOption((o) => o.setName('image').setDescription('Large image URL (inside the embed)'))
        .addStringOption((o) => o.setName('thumbnail').setDescription('Thumbnail URL'))
        .addStringOption((o) => o.setName('author').setDescription('Author name'))
        .addStringOption((o) => o.setName('author_icon').setDescription('Author icon URL'))
        .addStringOption((o) => o.setName('author_url').setDescription('Author URL'))
        .addStringOption((o) =>
          o.setName('buttons').setDescription('Label1|URL1|Label2|URL2 … (up to 15 buttons)')
        )
        .addBooleanOption((o) => o.setName('timestamp').setDescription('Add timestamp to embed')),

      // /verify
      new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify a member and assign the verified role (staff only)')
        .addUserOption((o) =>
          o.setName('member')
            .setDescription('The member to verify')
            .setRequired(true)
        ),

      // /link
      new SlashCommandBuilder()
        .setName('link')
        .setDescription('Post an affiliate link')
        .addStringOption((o) =>
          o
            .setName('product')
            .setDescription('Choose a product')
            .setRequired(true)
            .addChoices(...LINK_OPTIONS.map((l) => ({ name: l.name, value: l.value })))
        ),

      // /tickets
      new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Send the ticket panel (owner only)'),

      // /question
      new SlashCommandBuilder()
        .setName('question')
        .setDescription('Send the anonymous question panel (owner only)'),

      // /add — add a user to the current ticket channel
      new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a user to this ticket (staff only)')
        .addUserOption((o) =>
          o.setName('user').setDescription('The user to add').setRequired(true)
        ),

      // /remove — remove a user from the current ticket channel
      new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a user from this ticket (staff only)')
        .addUserOption((o) =>
          o.setName('user').setDescription('The user to remove').setRequired(true)
        ),

    ].map((c) => c.toJSON());

    await rest.put(route, { body: cmds });
    console.log('[Bot] Slash commands registered');
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
  }

  // ── Sticky messages ──
  for (const cfg of STICKY_MESSAGES) {
    try {
      const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
      if (!channel) continue;
      let fetched;
      do {
        fetched = await channel.messages.fetch({ limit: 100 });
        const botMsgs = fetched.filter((m) => m.author.id === client.user.id);
        for (const [, msg] of botMsgs) await msg.delete().catch(() => null);
      } while (fetched.size === 100);

      const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(cfg.title).setDescription(cfg.description);
      const sent = await channel.send({ embeds: [embed] });
      stickyCache.set(cfg.channelId, sent.id);
      console.log(`[Sticky] Posted in ${cfg.channelId}`);
    } catch (err) {
      console.error(`[Sticky] Failed for ${cfg.channelId}:`, err);
    }
  }

  // Seed rotating channel activity
  try {
    const rotCh = await client.channels.fetch(ROTATING_MESSAGE.channelId).catch(() => null);
    if (rotCh) {
      const recent = await rotCh.messages.fetch({ limit: 50 });
      const lastHuman = recent.filter((m) => !m.author.bot).first();
      if (lastHuman) rotatingChannelLastActivity = lastHuman.createdTimestamp;
    }
  } catch (_) {}

  sendRotatingMessage();
  setInterval(sendRotatingMessage, ROTATING_MESSAGE.intervalMs);
});

// ─── ROTATING MESSAGE ──────────────────────────────────────────────────────────
async function sendRotatingMessage() {
  try {
    const now = Date.now();
    const hadActivity = (now - rotatingChannelLastActivity) < ROTATING_MESSAGE.intervalMs;
    if (!hadActivity) {
      console.log('[Rotating] Skipped — no activity in the past hour');
      return;
    }

    const channel = await client.channels.fetch(ROTATING_MESSAGE.channelId).catch(() => null);
    if (!channel) return;

    if (rotatingMessageId) {
      const old = await channel.messages.fetch(rotatingMessageId).catch(() => null);
      if (old) await old.delete().catch(() => null);
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(ROTATING_MESSAGE.title)
      .setDescription(ROTATING_MESSAGE.description);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(ROTATING_MESSAGE.buttonLabel)
        .setURL(ROTATING_MESSAGE.buttonUrl)
        .setStyle(ButtonStyle.Link)
    );
    const sent = await channel.send({ embeds: [embed], components: [row] });
    rotatingMessageId = sent.id;
    console.log('[Rotating] Message sent');
  } catch (err) {
    console.error('[Rotating] Error:', err);
  }
}

// ─── GHOST PING ────────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  try {
    const channel = member.guild.channels.cache.get(GHOST_PING_CHANNEL_ID);
    if (!channel) return;
    const msg = await channel.send(`<@${member.id}>`);
    await msg.delete();
  } catch (err) {
    console.error('[GhostPing] Error:', err);
  }
});

// ─── MESSAGE CREATE ────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channelId === ROTATING_MESSAGE.channelId) {
    rotatingChannelLastActivity = Date.now();
  }

  // ── Auto ❤️ react ──
  if (AUTO_REACT_CHANNEL_IDS.includes(message.channelId)) {
    try {
      await message.react('❤️');
    } catch (err) {
      console.error('[AutoReact] Error:', err);
    }
  }

  // ── Sticky messages ──
  const stickyCfg = STICKY_MESSAGES.find((s) => s.channelId === message.channelId);
  if (stickyCfg) {
    try {
      const oldId = stickyCache.get(message.channelId);
      if (oldId) {
        const old = await message.channel.messages.fetch(oldId).catch(() => null);
        if (old) await old.delete().catch(() => null);
      }
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(stickyCfg.title)
        .setDescription(stickyCfg.description);
      const sent = await message.channel.send({ embeds: [embed] });
      stickyCache.set(message.channelId, sent.id);
    } catch (err) {
      console.error('[Sticky] Error:', err);
    }
  }

  // ── Keyword replies ──
  const lowerContent = message.content.toLowerCase();
  for (const entry of KEYWORD_REPLIES) {
    const matched = entry.keywords.find((kw) => lowerContent.includes(kw.toLowerCase()));
    if (!matched) continue;

    const cooldownKey = entry.keywords[0];
    const lastSent = keywordCooldowns.get(cooldownKey) || 0;
    if (Date.now() - lastSent < KEYWORD_COOLDOWN_MS) break;

    try {
      await message.reply({ content: entry.reply, allowedMentions: { repliedUser: false } });
      keywordCooldowns.set(cooldownKey, Date.now());
      console.log(`[Keyword] Replied to "${matched}" in ${message.channelId}`);
    } catch (err) {
      console.error('[Keyword] Error:', err);
    }
    break;
  }
});

// ─── THREAD AUTO-MESSAGES ──────────────────────────────────────────────────────
client.on('threadCreate', async (thread) => {
  const cfg = THREAD_AUTO_MESSAGES.find((t) => t.parentChannelId === thread.parentId);
  if (!cfg) return;
  try {
    await new Promise((r) => setTimeout(r, 1000));
    const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(cfg.title).setDescription(cfg.description);
    const row = new ActionRowBuilder().addComponents(
      ...cfg.buttons.map((b) => new ButtonBuilder().setLabel(b.label).setURL(b.url).setStyle(ButtonStyle.Link))
    );
    await thread.send({ embeds: [embed], components: [row] });
    console.log(`[Thread] Auto-message sent in ${thread.id}`);
  } catch (err) {
    console.error('[Thread] Error:', err);
  }
});

// ─── TICKET HELPERS ────────────────────────────────────────────────────────────

// Maps ticket type → channel name prefix and embed heading
const TICKET_TYPE_CONFIG = {
  ticket_report: {
    prefix: 'report',
    title: 'Report',
    welcome:
      'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.\n\nTo make this the easiest possible process, please describe your issue in as much detail as possible, include who you are reporting, screenshots, etc.',
  },
  ticket_claim_client: {
    prefix: 'claim-client-role',
    title: 'Claim Client Role',
    welcome:
      'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.',
  },
  ticket_questions: {
    prefix: 'questions',
    title: 'Questions',
    welcome:
      'Welcome, thanks for contacting the Ascend Team.\n\nWe will be with you very shortly.\n\nTo make this the easiest possible process, please let us know any questions you may have now!',
  },
};

async function createTicket(interaction, type) {
  const guild = interaction.guild;
  const member = interaction.member;
  const cfg = TICKET_TYPE_CONFIG[type];
  if (!cfg) return;

  // Check for ANY existing open ticket by this user (across all ticket types)
  const existing = guild.channels.cache.find(
    (c) =>
      c.parentId === TICKET_CATEGORY_ID &&
      c.topic &&
      c.topic.endsWith(`:${member.user.id}`)
  );
  if (existing) {
    return interaction.reply({
      content: `<:cross:1479512858256478521> You already have an open ticket: <#${existing.id}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Channel name: e.g. report-123456789012345678
    const channelName = `${cfg.prefix}-${member.user.id}`;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      topic: `${type}:${member.user.id}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: member.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: TICKET_STAFF_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageRoles,
          ],
        },
      ],
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(cfg.title)
      .setDescription(cfg.welcome)
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const welcomeMsg = await ticketChannel.send({
      content: `<@${member.user.id}>`,
      embeds: [welcomeEmbed],
      components: [closeRow],
    });

    await welcomeMsg.pin().catch(() => null);
    await interaction.editReply({ content: `<:tick:1479512775440072755>  Your ticket has been created: <#${ticketChannel.id}>` });
    console.log(`[Ticket] Created ${channelName} for ${member.user.tag}`);
  } catch (err) {
    console.error('[Ticket] Error creating channel:', err);
    await interaction.editReply({ content: '<:cross:1479512858256478521> Failed to create ticket. Please contact a staff member.' });
  }
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (channel.parentId !== TICKET_CATEGORY_ID) {
    return interaction.reply({ content: '<:cross:1479512858256478521> This is not a ticket channel.', ephemeral: true });
  }

  // Only staff with TICKET_CLOSE_ROLE_ID or owner can close
  const member = interaction.member;
  const canClose =
    member.roles?.cache?.has(TICKET_CLOSE_ROLE_ID) ||
    interaction.user.id === OWNER_ID;

  if (!canClose) {
    return interaction.reply({
      content: '<:cross:1479512858256478521> You don\'t have permission to close tickets.',
      ephemeral: true,
    });
  }

  await interaction.reply({ content: '<:loading:1479510452215218197> Closing ticket in 5 seconds...' });

  setTimeout(async () => {
    try {
      await channel.delete();
      console.log(`[Ticket] Closed and deleted ${channel.name}`);
    } catch (err) {
      console.error('[Ticket] Error closing channel:', err);
    }
  }, 5000);
}

// ─── INTERACTIONS ──────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {

  // ── Modal submissions ──
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'question_modal') {
      const questionText = interaction.fields.getTextInputValue('question_input');
      try {
        const inboxChannel = await client.channels.fetch(QUESTIONS_INBOX_CHANNEL_ID).catch(() => null);
        if (!inboxChannel) {
          return interaction.reply({ content: '<:cross:1479512858256478521> Could not find the questions channel. Please contact an admin.', ephemeral: true });
        }

        const questionEmbed = new EmbedBuilder()
          .setColor(EMBED_COLOR)
          .setTitle('Anonymous Question')
          .setDescription(questionText)
          .setTimestamp();

        const deleteRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('question_delete')
            .setLabel('✕')
            .setStyle(ButtonStyle.Danger)
        );

        await inboxChannel.send({ embeds: [questionEmbed], components: [deleteRow] });
        await interaction.reply({ content: '<:tick:1479512775440072755> Your question has been submitted anonymously!', ephemeral: true });
      } catch (err) {
        console.error('[Question] Error submitting:', err);
        await interaction.reply({ content: '<:cross:1479512858256478521> Failed to submit your question.', ephemeral: true });
      }
    }
    return;
  }

  // ── Button interactions ──
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (['ticket_report', 'ticket_claim_client', 'ticket_questions'].includes(customId)) {
      return createTicket(interaction, customId);
    }

    if (customId === 'ticket_close') {
      return closeTicket(interaction);
    }

    if (customId === 'submit_question') {
      const modal = new ModalBuilder()
        .setCustomId('question_modal')
        .setTitle('Submit a Question');

      const input = new TextInputBuilder()
        .setCustomId('question_input')
        .setLabel('Your question')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Type your question here...')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (customId === 'question_delete') {
      const member = interaction.member;
      const hasRole =
        CLIENT_ROLE_IDS.some((id) => member.roles?.cache?.has(id)) ||
        interaction.user.id === OWNER_ID;
      if (!hasRole) {
        return interaction.reply({ content: '<:cross:1479512858256478521> You don\'t have permission to do this.', ephemeral: true });
      }
      try {
        await interaction.message.delete();
      } catch (err) {
        console.error('[Question] Error deleting:', err);
        await interaction.reply({ content: '<:cross:1479512858256478521> Failed to delete.', ephemeral: true });
      }
      return;
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  try {
    // ── /eval ──
    if (interaction.commandName === 'eval') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> Not authorised.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const code = interaction.options.getString('code');
      try {
        let result = eval(code);
        if (result instanceof Promise) result = await result;
        const out = util.inspect(result, { depth: 2 });
        await interaction.editReply({ content: `\`\`\`js\n${out.slice(0, 1900)}\n\`\`\`` });
      } catch (e) {
        await interaction.editReply({ content: `\`\`\`js\n${String(e).slice(0, 1900)}\n\`\`\`` });
      }

    // ── /info ──
    } else if (interaction.commandName === 'info') {
      await interaction.deferReply();
      const { guild, client } = interaction;
      await guild.fetch();
      const s = Math.floor(client.uptime / 1000);
      const uptime = `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
      await interaction.editReply({
        embeds: [
          new EmbedBuilder().setColor(EMBED_COLOR).setTitle('🤖 Bot Info')
            .addFields(
              { name: 'Tag', value: client.user.tag, inline: true },
              { name: 'Uptime', value: uptime, inline: true },
              { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }
            ).setThumbnail(client.user.displayAvatarURL()),
          new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`📊 ${guild.name}`)
            .addFields(
              { name: 'Members', value: `${guild.memberCount}`, inline: true },
              { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
              { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
              { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
              { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
            ).setThumbnail(guild.iconURL({ dynamic: true })),
        ],
      });

    // ── /embed ──
    } else if (interaction.commandName === 'embed') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> Not authorised.', ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      const ch          = interaction.options.getChannel('channel');
      const content     = interaction.options.getString('content') ?? undefined;
      const imageUrl    = interaction.options.getString('image_url');
      const title       = interaction.options.getString('title');
      const desc        = interaction.options.getString('description')?.replace(/\\n/g, '\n');
      const colorRaw    = interaction.options.getString('color');
      const color       = colorRaw ? parseInt(colorRaw.replace('#', ''), 16) || EMBED_COLOR : EMBED_COLOR;
      const footer      = interaction.options.getString('footer');
      const footerIcon  = interaction.options.getString('footer_icon');
      const embedImage  = interaction.options.getString('image');
      const thumbnail   = interaction.options.getString('thumbnail');
      const author      = interaction.options.getString('author');
      const authorIcon  = interaction.options.getString('author_icon');
      const authorUrl   = interaction.options.getString('author_url');
      const buttonsRaw  = interaction.options.getString('buttons');
      const ts          = interaction.options.getBoolean('timestamp');

      const hasEmbedContent = title || desc || footer || embedImage || thumbnail || author;

      const embeds = [];
      if (hasEmbedContent) {
        const embed = new EmbedBuilder().setColor(color);
        if (title)      embed.setTitle(title);
        if (desc)       embed.setDescription(desc);
        if (footer)     embed.setFooter({ text: footer, iconURL: footerIcon ?? undefined });
        if (embedImage) embed.setImage(embedImage);
        if (thumbnail)  embed.setThumbnail(thumbnail);
        if (author)     embed.setAuthor({ name: author, iconURL: authorIcon ?? undefined, url: authorUrl ?? undefined });
        if (ts)         embed.setTimestamp();
        embeds.push(embed);
      }

      if (!content && embeds.length === 0 && !imageUrl) {
        return interaction.editReply({
          content: '<:cross:1479512858256478521> Nothing to send! Provide at least `content`, an embed field (title/description/etc), or `image_url`.',
        });
      }

      const components = buttonsRaw ? buildButtonRows(buttonsRaw) : [];

      const files = [];
      if (imageUrl) {
        try {
          const buf = await downloadBuffer(imageUrl);
          const ext = imageUrl.split('?')[0].split('.').pop().split('/').pop().toLowerCase() || 'png';
          files.push(new AttachmentBuilder(buf, { name: `image.${ext}` }));
        } catch (e) {
          return interaction.editReply({ content: `<:cross:1479512858256478521> Failed to download image: \`${e.message}\`` });
        }
      }

      try {
        await ch.send({ content, embeds, components, files });
        await interaction.editReply({ content: `<:tick:1479512775440072755>  Sent to <#${ch.id}>!` });
      } catch (e) {
        await interaction.editReply({ content: `<:cross:1479512858256478521> Failed to send: \`${e.message}\`` });
      }

    // ── /verify ──
    } else if (interaction.commandName === 'verify') {
      const member = interaction.member;
      if (!member.roles?.cache?.has('1462396655558201365'))
        return interaction.reply({ content: '<:cross:1479512858256478521> You don\'t have permission to use this command.', ephemeral: true });

      const targetUser = interaction.options.getUser('member');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember)
        return interaction.reply({ content: '<:cross:1479512858256478521> Could not find that member in this server.', ephemeral: true });

      try {
        await targetMember.roles.add('1442822567525224448');
        await interaction.reply({
          content: `<:tick:1479512775440072755> <@${targetUser.id}> has been successfully verified!`,
        });
        console.log(`[Verify] ${targetUser.tag} verified by ${interaction.user.tag}`);
      } catch (err) {
        console.error('[Verify] Error:', err);
        await interaction.reply({ content: '<:cross:1479512858256478521> Failed to assign the role. Make sure the bot has the Manage Roles permission and its role is above the verified role.', ephemeral: true });
      }

    // ── /link ──
    } else if (interaction.commandName === 'link') {
      const value = interaction.options.getString('product');
      const entry = LINK_OPTIONS.find((l) => l.value === value);
      if (!entry)
        return interaction.reply({ content: '<:cross:1479512858256478521> Unknown product.', ephemeral: true });

      const btn = new ButtonBuilder()
        .setLabel(`🔗 ${entry.name}`)
        .setURL(entry.url)
        .setStyle(ButtonStyle.Link);
      const row = new ActionRowBuilder().addComponents(btn);
      await interaction.reply({ content: entry.url, components: [row] });

    // ── /tickets ──
    } else if (interaction.commandName === 'tickets') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> Not authorised.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('Create a Support Ticket')
        .setDescription(
          'To get support, click the corresponding button below.\n\nThis will create a private ticket where our team can assist you directly.\n\nPlease only open a ticket for a valid reason so we can respond quickly and efficiently.'
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_report')
          .setLabel('📋 Report')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_claim_client')
          .setLabel('🏅 Claim Client Role')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_questions')
          .setLabel('❓ Questions')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '<:tick:1479512775440072755> Ticket panel sent.', ephemeral: true });

    // ── /question ──
    } else if (interaction.commandName === 'question') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> Not authorised.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setDescription(
          "Have a question but prefer to stay behind the scenes?\n\nYou can submit it anonymously by clicking the *\"Submit a Question\"* attached to this message.\n\nThis space is here for you — if you'd rather not speak up in voice chat, this option lets you share your thoughts comfortably.  All submissions are anonymous, and we'll address them during our weekly calls."
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('submit_question')
          .setLabel('Submit a Question')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '<:tick:1479512775440072755> Question panel sent.', ephemeral: true });

    // ── /add ──
    } else if (interaction.commandName === 'add') {
      const member = interaction.member;
      const hasRole = CLIENT_ROLE_IDS.some((id) => member.roles?.cache?.has(id)) || interaction.user.id === OWNER_ID;
      if (!hasRole)
        return interaction.reply({ content: '<:cross:1479512858256478521> You don\'t have permission to use this command.', ephemeral: true });

      const channel = interaction.channel;
      if (channel.parentId !== TICKET_CATEGORY_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> This command can only be used inside a ticket channel.', ephemeral: true });

      const targetUser = interaction.options.getUser('user');
      try {
        await channel.permissionOverwrites.edit(targetUser.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        await interaction.reply({ content: `<:tick:1479512775440072755> <@${targetUser.id}> has been added to this ticket.` });
        console.log(`[Ticket] Added ${targetUser.tag} to ${channel.name}`);
      } catch (err) {
        console.error('[Ticket] Error adding user:', err);
        await interaction.reply({ content: '<:cross:1479512858256478521> Failed to add user.', ephemeral: true });
      }

    // ── /remove ──
    } else if (interaction.commandName === 'remove') {
      const member = interaction.member;
      const hasRole = CLIENT_ROLE_IDS.some((id) => member.roles?.cache?.has(id)) || interaction.user.id === OWNER_ID;
      if (!hasRole)
        return interaction.reply({ content: '<:cross:1479512858256478521> You don\'t have permission to use this command.', ephemeral: true });

      const channel = interaction.channel;
      if (channel.parentId !== TICKET_CATEGORY_ID)
        return interaction.reply({ content: '<:cross:1479512858256478521> This command can only be used inside a ticket channel.', ephemeral: true });

      const targetUser = interaction.options.getUser('user');

      // Prevent removing the ticket owner
      if (channel.topic && channel.topic.endsWith(`:${targetUser.id}`)) {
        return interaction.reply({ content: '<:cross:1479512858256478521> You cannot remove the ticket owner.', ephemeral: true });
      }

      try {
        await channel.permissionOverwrites.edit(targetUser.id, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        });
        await interaction.reply({ content: `<:tick:1479512775440072755> <@${targetUser.id}> has been removed from this ticket.` });
        console.log(`[Ticket] Removed ${targetUser.tag} from ${channel.name}`);
      } catch (err) {
        console.error('[Ticket] Error removing user:', err);
        await interaction.reply({ content: '<:cross:1479512858256478521> Failed to remove user.', ephemeral: true });
      }
    }

  } catch (err) {
    console.error(`[Command] /${interaction.commandName}:`, err);
    const m = { content: '<:cross:1479512858256478521> An error occurred.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.editReply(m).catch(() => {});
    else await interaction.reply(m).catch(() => {});
  }
});

// ─── ERROR HANDLING ────────────────────────────────────────────────────────────
client.on('error', (err) => console.error('[Client]', err));
process.on('unhandledRejection', (err) => console.error('[Unhandled]', err));
process.on('uncaughtException', (err) => console.error('[Uncaught]', err));

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
console.log('[Bot] Attempting login...');
console.log('[Bot] TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('[Bot] CLIENT_ID:', process.env.CLIENT_ID);
console.log('[Bot] GUILD_ID:', process.env.GUILD_ID);

if (!process.env.DISCORD_TOKEN) {
  console.error('[Bot] DISCORD_TOKEN is not set!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).then(() => {
  console.log('[Bot] Login successful');
}).catch((err) => {
  console.error('[Bot] Login FAILED:', err.message);
});
