
const FIELD_TYPES = [ "string", "number", "boolean", "date", "object", "array" ] as const;
type T_FieldType = (typeof FIELD_TYPES)[number];

type T_Field = {
    name: string;
    type: T_FieldType;
    opts: Record<string, any>;
}

export class Schema {

    private name: string;
    private fields: T_Field[];

    constructor(name: string) {
        this.name = name;
        this.fields = [];
    }

    field(field: T_Field): Schema {
        this.fields.push(field);
        return this;
    }

}