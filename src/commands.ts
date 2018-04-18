import * as path from "path";
import * as glob from "glob";

import { Config } from "./";
import { Command } from "./discord";

let commands: Array<Command | (new (config: Config) => Command)> = [];

// Dynamically load commands from ./commands
glob.sync(`${path.resolve(__dirname)}/commands/*.[jt]s`).forEach(file => {
    const command = require(path.resolve(file));
    if (command && command.default) commands.push(command.default);
});

export default commands;