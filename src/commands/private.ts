import { Command } from "../discord";

import Privacy from "./privacy";

const command: Command = {
    name: "private",
    description: "Alias for `^privacy private`",
    permissions: Privacy.permissions,
    hidden: true,
    async handler(msg) {
        return Privacy.handler.call(this, msg, "private");
    }
};
export default command;