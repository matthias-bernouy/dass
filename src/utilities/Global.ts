import { resolve, join} from "path";


export const library_dir = resolve(import.meta.dir, "../../");
export const resources_dir = join(library_dir, "resources");

export const generated_code_dir = join(process.cwd(), "node_modules", ".dass-generated");
export const generated_types_dir = join(process.cwd(), "node_modules", "@types", ".dass-generated");