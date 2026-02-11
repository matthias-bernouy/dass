import { Application } from "src/core/application/Application";
import { Schema } from "src/core/schema/Schema";

export function UserSchema(): Schema {

    return Schema.create("User", 1)
        .String("email")
        .String("password")
        .Number("age");

}