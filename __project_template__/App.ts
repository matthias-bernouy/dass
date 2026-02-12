import { HookRegistry } from "./dass/config/HookRegistry";
import { Application } from "dass"

HookRegistry();

Application.dev(__dirname);