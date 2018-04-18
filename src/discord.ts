import * as debug from "debug";
import * as eris from "eris";
import * as request from "request-promise-native";

import { Config } from "./index"
import { Group, Channel } from "./database";
import { WSAEHOSTDOWN } from "constants";

export interface Command {
    name: string;
    description: string;
    permissions?: string[];
    userids?: string[];
    hidden?: boolean;
    handler: (this: DiscordClient, msg: eris.Message, ...args: string[]) => void;
}

const disabledEvents = {
    "CHANNEL_DELETE": true,
    "CHANNEL_UPDATE": true,
    "GUILD_BAN_ADD": true,
    "GUILD_BAN_REMOVE": true,
    "GUILD_MEMBER_ADD": true,
    "GUILD_MEMBER_REMOVE": true,
    "GUILD_MEMBER_UPDATE": true,
    "GUILD_ROLE_CREATE": true,
    "GUILD_ROLE_DELETE": true,
    "GUILD_ROLE_UPDATE": true,
    "GUILD_UPDATE": true,
    "PRESENCE_UPDATE": true,
    "USER_UPDATE": true,
    "VOICE_STATE_UPDATE": true
}

export const useridMention = /<@!?(\d+)>/g;
export const channelMention = /<#(\d+)>/g;
export const userdiscrimMention = /@([^#]{2,32})#(\d{4})/g;

export default class DiscordClient {
    bot: eris.Client;
    commands: Command[] = [];
    readonly log = debug("crosstalk:discord");

    constructor(readonly config: Config) {
        this.bot = new eris.Client(config.discordToken, {
            disableEvents: disabledEvents,
            restMode: true
        });

        this.bot.on("ready", () => {
            this.log("Connected as %s (%s)", this.bot.user.username, this.bot.user.id);
        });

        this.bot.on("messageCreate", async msg => {
            msg.channel.messages.remove(msg);
            if (msg.author.bot) return;

            if (msg.content.startsWith("^")) {
                this.handleCommand(msg.content.substring(1).split(" "), msg); // Handle the command
            } else {
                const chan = await Channel.where("snowflake", "=", msg.channel.id).first();
                if (!chan || !chan.enabled) return;
                this.log("Handling message: %s from %s (%s)", msg.id, msg.author.username, msg.author.id);
                const group = await chan.group.first();
                if (!group) return;

                const chans = await group.channels.all();
                const channel = msg.channel as eris.TextChannel;
                let username = `${msg.author.username}#${msg.author.discriminator}`;

                if (msg.author.id in this.config.suffixes)
                    username += ` ${this.config.suffixes[msg.author.id]}`;
                if (username.length > 32)
                    username = msg.author.username;

                for (let chan of chans) {
                    if (chan.snowflake == msg.channel.id || !chan.enabled) continue;

                    let rawContent = msg.content;
                    rawContent = rawContent.replace(useridMention, (match, id: string) => {
                        const member = channel.guild.members.get(id);
                        if (!this.bot.guilds.find(guild => guild.channels.has(chan.snowflake)).members.has(id) && member)
                            return `@${member.username}#${member.discriminator}`;

                        return match;
                    });
                    rawContent = rawContent.replace(channelMention, (match, id) => {
                        const guild = this.bot.guilds.find(guild => !!guild.channels.has(id));
                        const mentionedChannel = guild.channels.get(id);
                        if (channel.guild.id != guild.id && mentionedChannel)
                            return `#${mentionedChannel.name}`

                        return match;
                    });
                    rawContent = rawContent.replace(userdiscrimMention, (match, username: string, discrim: string) => {
                        const member = this.bot.guilds.find(guild => guild.channels.has(chan.snowflake)).members.find(member => member.username == username && member.discriminator == discrim);
                        if (member)
                            return `<@${member.id}>`;

                        return match;
                    });

                    const webhookPayload: eris.WebhookPayload = {
                        avatarURL: msg.author.avatarURL,
                        username: username,
                        disableEveryone: true,
                        content: rawContent,
                        file: await Promise.all(msg.attachments.map(async attachment => {
                            return {
                                file: await request.get(attachment.url, { encoding: null }),
                                name: attachment.filename
                            }
                        }))
                    };

                    if (msg.author.id != chan.last_sender)
                        [chan.webhook, chan.webhook_alt] = [chan.webhook_alt, chan.webhook];

                    try {
                        const webhook = {
                            id: chan.webhook.split("/")[0],
                            token: chan.webhook.split("/")[1]
                        }

                        await this.bot.executeWebhook(webhook.id, webhook.token, webhookPayload);
                    } catch {
                        try {
                            const webhook = await this.bot.createChannelWebhook(chan.snowflake, { name: `CrossTalk ${chan.snowflake}`, avatar: this.bot.user.avatar! });
                            chan.webhook = [webhook.id, webhook.token].join("/");

                            await this.bot.executeWebhook(webhook.id, webhook.token, webhookPayload);
                        } catch (e) {
                            this.log("Disabling channel: %s (%s)", chan.snowflake, e);
                            chan.enabled = false;
                        }
                    }
                    chan.last_sender = msg.author.id;
                    await chan.save();
                }
                this.log("Handled message: %s from %s (%s)", msg.id, msg.author.username, msg.author.id);
            }
        });
    }

    addCommand(command: Command) {
        this.commands.push(command);
    }

    getCommand(name: string, msg: eris.Message) {
        const command = this.commands.find(command => command.name == name.toLowerCase());
        if (!command) return;

        if (command.permissions) {
            if (!(msg.channel instanceof eris.TextChannel)) return;
            const member = msg.channel.guild.members.find(member => member.id == msg.author.id)
            if (!member) return;
            if (msg.channel.guild.ownerID != member.id)
                for (const permission in command.permissions)
                    if (!member.permission.has(permission)) return;
        }
        if (command.userids && !command.userids.find(userid => userid == msg.author.id)) return;

        return command;
    }

    handleCommand(args: string[], msg: eris.Message) {
        const name = args.shift();
        if (!name) return;
        
        const command = this.getCommand(name, msg);
        if (!command) return;

        this.log("Handling %s command: %s from %s (%s)", command.name, msg.id, msg.author.username, msg.author.id);
        command.handler.call(this, msg, ...args);
    }

    async connect() {
        return this.bot.connect();
    }
}