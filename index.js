"use strict";

import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import fs from "fs";
import { createConnection } from "./utils/database.js";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config();

globalThis.client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const token = process.env.BOT_TOKEN;

// commands be loading
async function loadCommands() {
  globalThis.client.commands = new Collection();
  const commandsPath = resolve("./commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = resolve(commandsPath, file);
    const command = await import(filePath);

    // Make sure commands are valid
    if ("data" in command && "execute" in command) {
      globalThis.client.commands.set(command.data.name, command);
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// bot ready for gaming
async function handleClientReady() {
  console.log(`Logged in as ${globalThis.client.user.tag}. It's gaming time`);
}

// someone sent a message
async function handleMessageCreate(message) {
  if (message.author.bot || !message.guild) return;

  const sql = `
    INSERT INTO messages (message_id, channel_id, author_id, content, timestamp, mentions, mention_roles)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const values = [
    message.id,
    message.channelId,
    message.author.id,
    message.content,
    message.createdTimestamp,
    JSON.stringify([...message.mentions.users.keys()]),
    JSON.stringify([...message.mentions.roles.keys()]),
  ];
  try {
    const db = await createConnection();
    await db.query(sql, values);
    await db.end();
  } catch (error) {
    console.error("Failed storing message:", error);
  }
}

// someone did something with a vc
async function handleVoiceStateUpdate(oldState, newState) {
  const guild_id = newState.guild?.id || oldState.guild?.id;
  const user_id = newState.id || oldState.id;
  if (!guild_id || !user_id) return;

  if (!oldState.channel && newState.channel) {
    const sql = `
      INSERT INTO voice_activity (session_id, user_id, channel_id, guild_id, join_time)
      VALUES (?, ?, ?, ?, ?);
    `;
    const values = [
      newState.sessionId,
      user_id,
      newState.channel.id,
      guild_id,
      new Date(),
    ];
    try {
      const db = await createConnection();
      await db.query(sql, values);
      await db.end();
    } catch (error) {
      console.error("Error logging voice join:", error);
    }
  }

  if (oldState.channel && !newState.channel) {
    const sql = `
      UPDATE voice_activity
      SET leave_time = ?
      WHERE user_id = ? AND leave_time IS NULL;
    `;
    const values = [new Date(), user_id];
    try {
      const db = await createConnection();
      await db.query(sql, values);
      await db.end();
    } catch (error) {
      console.error("Error logging voice leave:", error);
    }
  }
}

async function main() {
  await loadCommands();

  await globalThis.client.login(token);

  globalThis.client.once(Events.ClientReady, handleClientReady);
  globalThis.client.on(Events.MessageCreate, handleMessageCreate);
  globalThis.client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
}

main();
