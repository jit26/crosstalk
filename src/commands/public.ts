import { Command } from "../discord";

import Privacy from "./privacy";

const command: Command = {
    name: "public",
    description: "Alias for `^privacy public`",
    permissions: Privacy.permissions,
    hidden: true,
    async handler(msg) {
        return Privacy.handler.call(this, msg, "public");
    }
};
export default command;