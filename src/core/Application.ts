import type { Schema } from "./schema/Schema";



export class Application {

    private schemas: Schema[];

    constructor() {
        this.schemas = [];
    }

    registerSchema(schema: Schema) {
        this.schemas.push(schema);
    }
    // Hooks
    // Schemas
    // Plugins


    scan(){
        
    }

    build(){

    }
}