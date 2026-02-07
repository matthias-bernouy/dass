import type { HookRegister } from "../hooks/hook";
import type { Schema } from "../schema/Schema";


/**
 * 
 * This is the base class for all plugins.
 * It can be extended to create custom plugins.
 */
export abstract class BasePlugin {

    // Plugin should be able to register other plugins ? like dependencies ? Like adding a plugin only for this one ?
    abstract getHooks(): HookRegister[];
    abstract getSchemas(): Schema[];

}