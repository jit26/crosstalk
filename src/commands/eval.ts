import * as util from "util";

import { Config } from "../index";
import { Group, Channel } from "../database";
import { Command } from "../discord";

export default class implements Command {
    name = "eval";
    description = "Evaluates JavaScript code for testing purposes.";
    hidden = true;
    userids: Command["userids"];
    handler: Command["handler"] = async function(msg, ...args) {
        // Below code is loosely adapted from https://github.com/molenzwiebel/OriannaBot/blob/master/src/discord/commands/eval.ts
        try {
            const rawContent = args.join(" ").trim();

            let exprBody;
            if (rawContent.startsWith("```")) {
                const lines = rawContent.replace(/```/g, "").split("\n");
                exprBody = lines.map((x, i) => i === lines.length - 1 ? "return " + x : x).join("\n");
            } else {
                exprBody = "return (" + rawContent + ");";
            }

            const res = await eval(`(async (Group, Channel) => { ${exprBody} })`)(Group, Channel);
            let inspectedBody = util.inspect(res, false, 2);
            if (inspectedBody.length > 2000) inspectedBody = inspectedBody.slice(0, 1950) + "...";
            if (typeof res !== "undefined") msg.channel.createMessage({
                embed: {
                    title: "Result",
                    description: "```js\n" + inspectedBody + "```"
                }
            });
        } catch (e) {
            msg.channel.createMessage({
                embed: {
                    title: "Error",
                    description: e.message
                }
            });
        }
    }

    constructor(config: Config) {
        this.userids = [config.ownerSnowflake];
    }
}