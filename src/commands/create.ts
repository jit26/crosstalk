import { Command } from "../discord";

import Join from "./join";

const command: Command = {
    name: "create",
    description: "Alias for `^join`",
    permissions: Join.permissions,
    hidden: true,
    handler: Join.handler
};
export default command;