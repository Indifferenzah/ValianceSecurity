const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { loadConfig } = require("./src/core/config");
const { loadMessages } = require("./src/core/messages");
const { registerModules } = require("./src/core/permissions");
const { setupCommandHandler } = require("./src/core/respond");
const { logInfo } = require("./src/core/log");

let config = loadConfig();
let messages = loadMessages();


function buildIntents(cfg) {
  const intents = [];
  if (cfg.intents?.guilds) intents.push(GatewayIntentBits.Guilds);
  if (cfg.intents?.guildMembers) intents.push(GatewayIntentBits.GuildMembers);
  if (cfg.intents?.guildModeration) intents.push(GatewayIntentBits.GuildModeration);
  if (cfg.intents?.guildMessages) intents.push(GatewayIntentBits.GuildMessages);
  if (cfg.intents?.messageContent) intents.push(GatewayIntentBits.MessageContent);
  if (cfg.intents?.guildWebhooks) intents.push(GatewayIntentBits.GuildWebhooks);
  if (cfg.intents?.guildEmojisAndStickers) intents.push(GatewayIntentBits.GuildEmojisAndStickers);
  return intents;
}

const client = new Client({
  intents: buildIntents(config),
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

async function updatePresence(client) {
  const cfg = client.security.config;
  const p = cfg.presence;
  if (!p) return;

  let membersCount = null;

  if (p.memberCountGuild) {
    const guild = client.guilds.cache.get(p.memberCountGuild);
    if (guild) {
      try {
        await guild.members.fetch({ withPresences: false });
        membersCount = guild.memberCount;
      } catch {
        membersCount = guild.memberCount;
      }
    }
  }

  let text = p.activity?.text || "";
  if (membersCount !== null) {
    text = text.replace("{members}", membersCount.toLocaleString());
  }

  client.user.setPresence({
    status: p.status || "online",
    activities: p.activity
      ? [{
          name: text,
          type: p.activity.type || "PLAYING"
        }]
      : []
  });
}

client.security = {
  get config() { return config; },
  get messages() { return messages; },
  reload() {
    config = loadConfig(true);
    messages = loadMessages(true);
  },
  commands: new Collection()
};

registerModules(client);
setupCommandHandler(client);

client.once("ready", async () => {
  const readyMsg = messages.bot.ready
    .replace("{userTag}", client.user.tag)
    .replace("{prefix}", config.prefix);

  logInfo(client, readyMsg);
  console.log(readyMsg);

  await updatePresence(client);

  const interval = config.presence?.updateInterval;
  if (interval && interval > 0) {
    setInterval(() => updatePresence(client), interval);
  }
});

client.login(config.token);
