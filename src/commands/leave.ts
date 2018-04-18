import { Channel } from "../database";
import { Command } from "../discord";

const command: Command = {
    name: "leave",
    description: "Leaves the group the current channel is currently in.",
    permissions: ["manageChannel"],
    async handler(msg) {
        let chan = await Channel.where("snowflake", "=", msg.channel.id).first();
        if (chan) {
            const group = await chan.leaveGroup();
            if (group)
                msg.channel.createMessage(`Left ***${group.name}***!`);
        }
    }
};
export default command;