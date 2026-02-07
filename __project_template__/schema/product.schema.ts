import { Application } from "src/core/Application";
import { Schema } from "src/core/schema/Schema";

export function ProductSchema(): Schema {

    return Schema.create("Product")
        .String("name")
        .Number("price")

}