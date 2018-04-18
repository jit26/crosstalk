import * as eris from "eris";

import { Group, Channel } from "../database";
import { Command } from "../discord";

const command: Command = {
    name: "add",
    description: "Adds a channel that has requested to join to the group owned by the current channel.",
    permissions: ["manageChannel"],
    async handler(msg, id) {
        const chan = await Channel.where("snowflake", "=", msg.channel.id).first();
        if (!chan) {
            msg.channel.createMessage(`This channel does not have any associated group, use \`^create [group name]\`.`)
            return;
        }

        const group = await Group.where("owner_id", "=", chan.id).first();
        if (!group) {
            msg.channel.createMessage(`This channel doesn't own any groups.`);
            return;
        }

        let foreignChan;
        let erisChan;
        try {
            foreignChan = await Channel.where("snowflake", "=", id).first();
            erisChan = this.bot.getChannel(id) as eris.TextChannel;
            if (!foreignChan) {
                throw new Error();
            }
        } catch {
            msg.channel.createMessage(`A channel with the id ${id} could not be found.`);
            return;
        }

        if (await foreignChan.addToGroup(group.id)) {
            msg.channel.createMessage(`The channel #${erisChan.name} (<#${id}>) in **${erisChan.guild.name}** (${erisChan.guild.id}) has been added to ***${group.name}***.`);
            erisChan.createMessage(`This channel has been added to ***${group.name}***.`);
        } else {
            msg.channel.createMessage(`The channel #${erisChan.name} (<#${id}>) in **${erisChan.guild.name}** (${erisChan.guild.id}) needs to use \`^join ${group.name}\`.`);
        }
    }
};
export default command;