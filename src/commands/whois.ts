import * as eris from "eris";

import { Config } from "../index";
import { Group, Channel } from "../database";
import { Command, userdiscrimMention, useridMention } from "../discord";

let hiddenUserids: string[] = [];

export default class implements Command {
    name = "whois";
    description = "Finds where a user can access the current channel's group from.";
    handler: Command["handler"] = async function(msg, ...args) {
        let user: eris.User | undefined;
        let match = userdiscrimMention.exec(args.join(" "));
        if (match) {
            const [_, username, discrim] = match;
            user = this.bot.users.find(user => user.username == username && user.discriminator == discrim);
        } else {
            match = useridMention.exec(args.join(" "));
            if (match) {
                const [_, userid] = match;
                user = this.bot.users.find(user => user.id == userid);
            }
        }
        if (!user || hiddenUserids.find(userid => userid == user!.id)) {
            msg.channel.createMessage("The discord user entered could not be found.");
            return;
        }

        const chan = await Channel.where("snowflake", "=", msg.channel.id).first();
        if (!chan) {
            msg.channel.createMessage("This channel is not part of any group.");
            return;
        }

        const group = await chan.group.first();
        if (!group) {
            msg.channel.createMessage("This channel is not part of any group.");
            return;
        }

        let response = `**${user.username}#${user.discriminator}** in group **${group.name}**:\n`;
        let found = false;
        const channels = await group.channels.where("hidden", false).all();
        for (const channel of channels) {
            let erisGuild = this.bot.guilds.find(guild => guild.channels.has(channel.snowflake));
            let erisChannel = erisGuild.channels.find(erisChannel => erisChannel.id == channel.snowflake);
            if (!erisGuild.members.has(user.id)) continue;
            found = true;
            response += `- **${erisGuild.name}**: #${erisChannel.name} (${erisChannel.id})\n`;
        }

        if (!found) response += `The specified user could not be found in any channels in group **${group.name}**.`;
        await msg.channel.createMessage(response);
    }

    constructor(config: Config) {
        hiddenUserids.push(config.ownerSnowflake);
    }
}