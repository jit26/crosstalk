import { Command } from "../discord";

const command: Command = {
    name: "help",
    description: "Displays help for commands.",
    async handler(msg, name) {
        if (name) { // Display help for a single command.
            if (name.startsWith("^")) name = name.substring(1);
            const command = this.getCommand(name, msg);
            if (command) msg.channel.createMessage(`**${name}**: ${command.description}`);
            else msg.channel.createMessage(`The command **${name}** could not be found.`)
        } else { // List all available (non-hidden) commands.
            let response = "**Commands**:\n"
            for (const command of this.commands.filter(command => !command.hidden))
                response += `- **${command.name}**: ${command.description}\n`;

            response += "\n*made with ❤️ by @jit26#2711, feel free to contact for further help.*"
            
            msg.channel.createMessage(response);
        }
    }
};
export default command;