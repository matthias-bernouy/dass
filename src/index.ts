import { NumberField } from "./core/schema/Field/NumberField";
import { StringField } from "./core/schema/Field/StringField";
import { Schema } from "./core/schema/Schema";
import { create_tx_native } from "./core/ffi/dass-dlopen";
import { User } from "./core/ffi/User";


const schema = Schema.create("User")
    .String("name")
    .Number("age")
    .String("email");

const c_code = schema.generate();

console.log(c_code);