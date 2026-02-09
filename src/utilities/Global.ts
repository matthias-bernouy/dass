import { resolve, join} from "path";


export const library_dir = resolve(import.meta.dir, "../../");
export const resources_dir = join(library_dir, "resources");