const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { loadConfig } = require("./src/core/config");
const { loadMessages } = require("./src/core/messages");
const { ensureStateFile } = require("./src/core/storage");
const { registerModules } = require("./src/core/permissions");
const { setupCommandHandler } = require("./src/core/respond");
const { logInfo } = require("./src/core/log");

let config = loadConfig();
let messages = loadMessages();

ensureStateFile();

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
});

client.login(config.token);
