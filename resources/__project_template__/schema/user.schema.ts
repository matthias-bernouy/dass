import { Application } from "src/core/Application";
import { Schema } from "src/core/schema/Schema";

export function UserSchema(): Schema {

    return Schema.create("User")
        .String("email")
        .String("password")

}


Application.getInstance();
UserSchema().generate_c();