import Basie, { BaseModel, R, A } from "basie";
import { Database } from "sqlite3";
import * as debug from "debug";
import * as eris from "eris";

import DiscordClient from "./discord"

class _Group extends BaseModel {
    name: string;
    owner_id: number;
    public: boolean;

    owner: R<Channel> = this.hasOne(Channel);
    channels: A<Channel> = this.hasMany(Channel);

    constructor(name: string, owner_id: number) {
        super();
        this.name = name;
        this.owner_id = owner_id;
        this.public = false;
    }
}
export const Group = Basie.wrap<_Group>()(_Group);
export type Group = _Group;

class _Channel extends BaseModel {
    snowflake: string;
    enabled: boolean;
    requested_join: boolean;
    webhook: string;
    webhook_alt: string;
    last_sender: string;
    hidden: boolean;
    group_id: number;

    group: R<Group> = this.belongsTo(Group, "group_id");

    async addToGroup(group_id: number) {
        if (this.group_id == group_id) {
            this.enabled = true;
            await this.save();
            return true;
        } else {
            return false;
        }
    }

    async createOrJoinGroup(name: string, erisChan: eris.TextChannel) {
        this.leaveGroup();
        let group = await Group.where("name", "=", name).first();

        if (group) {
            if (this.group_id == group.id) return group;
            this.requested_join = false;
            const owner = await group.owner.first();

            if (!owner) {
                group.owner_id = this.id;
                this.enabled = true;
            } else {
                this.enabled = group.public;
            }

            this.group_id = group.id;
            await this.save();
            await group.save();
        } else {
            group = new Group(name, this.id);
            await group.save();
            this.enabled = true;
            this.group_id = group.id;
            await this.save();
        }

        return group;
    }

    async leaveGroup() {
        let group = await this.group.first();
        if (group && group.owner_id == this.id) {
            group.owner_id = 0;
            await group.save();
        }

        this.group_id = 0;
        this.enabled = false;

        await this.save();
        return group;
    }

    constructor(snowflake: string) {
        super();
        this.snowflake = snowflake;
    }
}
export const Channel = Basie.wrap<_Channel>()(_Channel);
export type Channel = _Channel;

export default async function Connect(filename: string) {
    const db = new Database(filename, err => {
        if (err) throw err;
        db.run("CREATE TABLE IF NOT EXISTS 'channels' ( `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, `snowflake` TEXT NOT NULL DEFAULT '' UNIQUE, `enabled` INTEGER NOT NULL DEFAULT 0, `requested_join` INTEGER NOT NULL DEFAULT 0, `webhook` TEXT NOT NULL DEFAULT '', `webhook_alt` TEXT NOT NULL DEFAULT '', `last_sender` TEXT NOT NULL DEFAULT '', `group_id` INTEGER NOT NULL DEFAULT 0 )");
        db.run("CREATE TABLE IF NOT EXISTS 'groups' ( `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, `name` TEXT NOT NULL DEFAULT '' UNIQUE, `owner_id` INTEGER NOT NULL DEFAULT 0, `public` INTEGER NOT NULL DEFAULT 0 )");
        Basie.sqlite(db);
    });
}