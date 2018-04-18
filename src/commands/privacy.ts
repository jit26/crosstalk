import { Group, Channel } from "../database";
import { Command } from "../discord";

const command: Command = {
    name: "privacy",
    description: "Allows you to set the privacy of the group owned by a channel.",
    permissions: ["manageChannels"],
    async handler(msg, privacy) {
        privacy = privacy.toLowerCase();
        if (privacy != "private" && privacy != "public") {
            msg.channel.createMessage(`Invalid privacy ${privacy}, please choose from private or public`);
            return;
        }

        const chan = await Channel.where("snowflake", "=", msg.channel.id).first();
        if (!chan) {
            msg.channel.createMessage(`This channel isn't registered in CrossTalk.`);
            return;
        }

        let group = await Group.where("owner_id", "=", chan.id).first();
        if (!group) {
            msg.channel.createMessage(`This channel doesn't own any group.`);
            return;
        }

        group.public = privacy == "public";
        await group.save();
        msg.channel.createMessage(`The group ***${group.name}*** has been set to ${privacy}.`)
    }
};
export default command;