import { Field } from "./Field";


export class StringField extends Field {

    constructor(name: string) {
        super(name);
    }

    getType(): string {
        return "string";
    }
}