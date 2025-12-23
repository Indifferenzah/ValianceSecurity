const { registerAntiBan } = require("../modules/antiBan");
const { registerAntiUnban } = require("../modules/antiUnban");
const { registerAntiChannels } = require("../modules/antiChannels");
const { registerAntiVanity } = require("../modules/antiVanity");
const { registerAntiWebhooks } = require("../modules/antiWebhooks");
const { registerAntiRoles } = require("../modules/antiRoles");
const { registerAntiBot } = require("../modules/antiBot");
const { registerAntiEveryone } = require("../modules/antiEveryone");
const { registerAntiStickers } = require("../modules/antiStickers");
const { registerAntiGhostPing } = require("../modules/antiGhostPing");

function registerModules(client) {
  registerAntiBan(client);
  registerAntiUnban(client);
  registerAntiChannels(client);
  registerAntiVanity(client);
  registerAntiWebhooks(client);
  registerAntiRoles(client);
  registerAntiBot(client);
  registerAntiEveryone(client);
  registerAntiStickers(client);
  registerAntiGhostPing(client);
}

module.exports = { registerModules };
