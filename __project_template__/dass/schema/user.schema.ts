import { Schema } from "src/core/schema/Schema";
import BeforeUserRegisterHook from "../hooks/BeforeAll";

export function UserSchema(): Schema {

    return Schema.create("User", 1)
        .String("email")
        .String("password")
        .Number("age");

}