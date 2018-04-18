import Basie from "basie";
import * as debug from "debug"
import * as eris from "eris";
import * as fs from "fs";

import Connect, { Group, Channel } from "./database";
import Discord, { Command } from "./discord";

import Commands from "./commands";

const info = debug("crosstalk");
const error = debug("crosstalk:error");

process.on("unhandledRejection", err => {
    error("Unhandled rejection: %O", err);
});

export interface Config {
    ownerSnowflake: string;
    discordToken: string;
    suffixes: {[snowflake: string]: string};
}

(async () => {
    info("CrossTalk starting up!");

    info("Reading config...");
    const config: Config = JSON.parse(fs.readFileSync(process.env.CONFIG_FILE || "./config.json", "utf-8"));

    info("Connecting to database...");
    await Connect(process.env.DB_FILE || "./crosstalk.db");

    info("Connecting to Discord...");
    const discord = new Discord(config);
    for (const command of Commands) {
        if (typeof command == "object")
            discord.addCommand(command);
        else {
            discord.addCommand(new command(config));
        }
    }
    await discord.connect();

    info("CrossTalk started!");
})();