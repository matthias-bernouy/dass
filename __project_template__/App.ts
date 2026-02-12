import { Application } from "src/core/application/Application";
import { HookRegistry } from "./dass/config/HookRegistry";

HookRegistry();

Application.dev(__dirname);