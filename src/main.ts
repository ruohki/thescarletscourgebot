import { BlizzAPI } from 'blizzapi';
import { Client, Intents } from 'discord.js';
import * as lodash from 'lodash';
import fetch from 'node-fetch';


const Delay = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));
const Log = (message: string, severity: string = "Info") => console.log(`[${new Date().toUTCString()}][${severity}] ${message}`);

const clientId = process.env.BNET_CLIENTID 
const clientSecret = process.env.BNET_CLIENTSECRET 
const botToken = process.env.DISCORD_TOKEN 


if (!clientId) {
  Log("No Battlenet Client ID (BNET_CLIENTID) supplied.", "Error");
  process.exit(-1)
}

if (!clientSecret) {
  Log("No Battlenet Client Secret (BNET_CLIENTSECRET) supplied.", "Error");
  process.exit(-1)
}

if (!botToken) {
  Log("No Discord Bot Token (DISCORD_TOKEN) supplied.", "Error");
  process.exit(-1)
}

const allowed_characters: Array<Array<string>> = [
  ['A', 'Á', 'À', 'Â', 'Ä', 'Å', 'Ã'],
  ['B'],
  ['O', 'Ó', 'Ò', 'Ô', 'Ö', 'Õ', 'Ø'],
  ['M'],
  ['I', 'Í', 'Ì', 'Î', 'Ï'],
  ['N','Ñ'],
  ['A', 'Á', 'À', 'Â', 'Ä', 'Å', 'Ã'],
  ['T'],
  ['I', 'Í', 'Ì', 'Î', 'Ï'],
  ['O', 'Ó', 'Ò', 'Ô', 'Ö', 'Õ', 'Ø'],
  ['N','Ñ']
];

class NameGenerator {
  private generatedOrInvalidNames: Set<String> = new Set<String>();

  constructor(unavailable_names: Array<string>) {
    this.generatedOrInvalidNames = new Set(unavailable_names);
  }

  public async generateName() {
    while (true) {
      let potential_name = "";
      for(let [index, characters] of allowed_characters.entries()) {
        const starting_char = Math.floor(Math.random() * allowed_characters[index].length);

        const character = characters[starting_char]
        potential_name += character;
      }
      
      const capitalized_name = lodash.capitalize(potential_name)
      if (!this.generatedOrInvalidNames.has(capitalized_name)) {
        this.generatedOrInvalidNames.add(capitalized_name);
        const test_name = await fetch(`https://worldofwarcraft.com/en-gb/character/eu/ravencrest/${capitalized_name}`);

        if (test_name.status === 404) {
          return capitalized_name;
        }
      }
    }
  }
  async *[Symbol.asyncIterator]() {
    yield this.generateName();
  }
}

const api = new BlizzAPI({
  region: 'eu',
  clientId,
  clientSecret
});


const updateRooster = async () => {
  Log("Updating Guild Rooster");
  const data = await api.query('/data/wow/guild/ravencrest/the-scarlet-scourge/roster?namespace=profile-eu');
  Log("Rooster updated");
  return lodash.map(data.members, 'character.name');
}

(async () => {
  const client = new Client();

  let nameGenerator = new NameGenerator(await updateRooster())
  setInterval(async () => {
    nameGenerator = new NameGenerator(await updateRooster());
  }, 600000);

  client.on('ready', () => {
    console.log(`Logged in as ${client?.user?.tag}!`);
    Log("Setting status...", "Info");
    client.user?.setPresence({
      activity: {
        name: "!nameme"
      }
    })
  });

  client.on('message', async message => {
    if (message.content === "!nameme") {
      const names = await Promise.all(lodash.range(0, 5).map(() => nameGenerator.generateName()));

      const channel = await message.author.createDM();
      await channel.send(`Here are some free names for you to choose from: **${names.join(", ")}**`);
      await message.reply(`As requested i've send you five possible names that are curently free to pick!`);
    }
  });

  client.login(botToken);
})();
