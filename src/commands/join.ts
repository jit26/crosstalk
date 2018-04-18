import * as eris from "eris";

import { Channel } from "../database";
import { Command } from "../discord";

const command: Command = {
    name: "join",
    description: "Joins, requests to join or creates a channel group.",
    permissions: ["manageChannel"],
    async handler(msg, ...args) {
        let chan = await Channel.where("snowflake", "=", msg.channel.id).first();
        if (!chan) {
            chan = new Channel(msg.channel.id);
            await chan.save();
        }

        const name = args.join(" ");
        const group = await chan.createOrJoinGroup(name, msg.channel as eris.TextChannel);
        const owner = await group.owner.first();
        if (!chan.enabled) {
            chan.requested_join = true;
            await chan.save();
            const erisChan = this.bot.getChannel(owner!.snowflake) as eris.TextChannel;
            const localChan = msg.channel as eris.TextChannel;
            msg.channel.createMessage(`The group ***${name}*** already exists. #${erisChan.name} (<#${erisChan.id}>) in **${erisChan.guild.name}** (${erisChan.guild.id}) needs to use \`^add ${localChan.id}\`.`);
        } else if (owner!.snowflake == msg.channel.id) {
            msg.channel.createMessage(`The group ***${name}*** has been created. Other channels can request to join using \`^join ${name}\` and you can make the group public using \`^public\` to allow anyone to \`^join\`.`);
        } else {
            msg.channel.createMessage(`The group ***${name}*** already exists and has been joined.`);
        }
    }
};
export default command;