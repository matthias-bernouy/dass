// @bun
// src/core/application/Application.ts
import path4 from "path";
import { watch } from "fs";

// src/core/application/ApplicationObjects.ts
var {Glob } = globalThis.Bun;

// src/utilities/smartFileWriter.ts
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
async function smartFileWriter(filePath, content) {
  const hashPath = `${filePath}.hash`;
  const currentHash = Bun.hash(content).toString();
  let oldHash = "";
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath))
    mkdirSync(dirPath, { recursive: true });
  const hashFile = Bun.file(hashPath);
  if (await hashFile.exists()) {
    oldHash = await hashFile.text();
  }
  if (currentHash === oldHash && existsSync(filePath)) {
    return;
  }
  await Promise.all([
    Bun.write(filePath, content),
    Bun.write(hashPath, currentHash)
  ]);
  return;
}

// src/generated/ts/server.raw.ts
var server_raw_default = `//{{ROUTES_IMPORTS}}

const threadid = Math.random().toString(16).substring(2, 10);

export function Server(){
    Bun.serve({
        port: 3000,
        reusePort: true,
        fetch(request) {
            return new Response(\`THREAD \${threadid.toString()} - No route matched\`, { status: 404 });
        },
        routes: {
//{{ROUTES_CALLS}}
        }
    })
}`;

// src/generated/ts/ffi_methods.raw.ts
var ffi_methods_raw_default = `import { dlopen, FFIType, ptr } from "bun:ffi";

const path = "{{PATH_C}}";

export const { symbols } = dlopen(path, {

//{{METHODS}}

    // Transaction management
    create_tx: {
        args: [],
        returns: FFIType.u64,
    },

    commit_tx: {
        args: [FFIType.u64],
        returns: FFIType.u32,
    },

    abort_tx: {
        args: [FFIType.u64],
        returns: FFIType.u32,
    }

})

export default symbols;`;

// src/generated/ts/endpoint/endpoint.raw.ts
var endpoint_raw_default = `import type { BunRequest } from "bun";
import { symbols } from "../ffi_methods.raw";
import { baseDASSRequest } from "../utilities/baseDASSRequest";
//IMPORT_HOOKS

export default function endpoint() {
    let ret = {
        "/target": {
            //START_METHODS
            async METHOD(req: BunRequest) {
                const request: DAASRequest = await baseDASSRequest(req);
                let response: DAASResponse = {
                    status: 200,
                    body: "HELLO WORLDDDD",
                    headers: {}
                };

                //BEFORE_CALL_ENDPOINT

                const commit_response = symbols.commit_tx(request.data.transactionID);

                if (!commit_response) {
                    response = {
                        status: 500,
                        body: "Error committing transaction",
                        headers: {
                            "Content-Type": "text/plain",
                            "Content-Length": "Error committing transaction".length.toString()
                        }
                    }
                }
                (async () => {
                    //AFTER_CALL_ENDPOINT
                })();
                return new Response(response.body, { status: response.status, headers: response.headers });
            },
            //END_METHODS
        },
    };

    return ret;
}`;

// src/generated/c/C_DOCUMENT_TEMPLATE.c
var C_DOCUMENT_TEMPLATE_default = `#include "shared.h"
#include "document.h"

static const uint16_t SCHEMA_ID   = 0;//Generated
static const uint16_t DEF_ZONE_ID = 0;//Generated

typedef struct {
	uint64_t last_tx_id;
	DocumentComposedID _id;
{{STRUCTS}}
	uint8_t  raw[];
} Template;

Template* create_template({{CREATE_PARAMS}} uint64_t tx_id) {

	uint64_t cpt_raw = 0;
	const uint64_t create_raw_size = 0;//Generated
	const uint64_t total_size = sizeof(Template) + create_raw_size;
	Template* element = calloc_heap(total_size);

	element->_id = thread_generate_id_document(DEF_ZONE_ID, SCHEMA_ID);

{{CREATE_OBJECT}}

{{CREATE_RAW_DATA}}

	FnResponse res = thread_create_document(element->_id, (void*)element, total_size, tx_id);

	return element;
}

static void id_to_hex(DocumentComposedID* id, char* out) {
    char hex_id[33];
    sprintf(hex_id, "%016llx%04x%08x%04x", 
            (unsigned long long)id->salt, 
            (unsigned int)id->zone, 
            (unsigned int)id->shard, 
            (unsigned int)id->id);
    strcpy(out, hex_id);
}

uint32_t get_template_as_json(DocumentComposedID* _id, char* json_output) {
	Template* element = get_document(_id, SCHEMA_ID);
	if (element == NULL) return 0;

	char uuid_hex[33];
    id_to_hex(&element->_id, uuid_hex);

	json_output[0] = '{';
	memcpy(json_output + 1, "\\"_id\\":\\"", 7);
	memcpy(json_output + 8, uuid_hex, 32);
	json_output[40] = '"';

	uint64_t raw_cpt = 0;
	uint64_t json_cpt = 41;

	memcpy(json_output + json_cpt++, ",", 1);

//{{GET_AS_JSON}}

	json_output[json_cpt++] = '}';



	return json_cpt++;
}

void* get_template(DocumentComposedID* _id) {
    return get_document(_id, SCHEMA_ID);
}

FnResponse delete_template(DocumentComposedID* _id, uint64_t tx_id){
	Template* element = get_document(_id, SCHEMA_ID);
	if (element == NULL) return false;
	return delete_document(_id, tx_id, element->last_tx_id);
}

FnResponse update_template({{UPDATE_PARAMS}} DocumentComposedID* _id, uint64_t tx_id) {

	Template* initial_element = get_document(_id, SCHEMA_ID);
	if (initial_element == NULL) return false;

    uint64_t cpt_raw = 0;
    const uint64_t update_raw_size = 0;//Generated
    const uint64_t total_size = sizeof(Template) + update_raw_size;
    Template* element = calloc_heap(total_size);

{{UPDATE_OBJECT}}

{{UPDATE_RAW_DATA}}

	return update_document(_id, element, total_size, tx_id, initial_element->last_tx_id);
}`;

// src/core/application/templates.ts
function get_server_template() {
  return server_raw_default;
}
function get_ffi_methods_template() {
  return ffi_methods_raw_default;
}
function get_endpoint_template() {
  return endpoint_raw_default;
}
function get_template_c() {
  return C_DOCUMENT_TEMPLATE_default;
}

// src/core/endpoint/generate_endpoints_hooks.ts
async function generate_endpoint_hooks(template, endpoint) {
  let importHookStatement = new Set;
  const hooks = ApplicationObjects.getHooks();
  for (const method of endpoint.getMethods()) {
    let beforeHooksCode = "";
    let afterHooksCode = "";
    for (const hook of hooks) {
      for (const target of [hook.getTarget()].flat()) {
        if (target.getTarget() != endpoint.getTarget())
          continue;
        if (hook.getType() === "before_response") {
          beforeHooksCode += hook.generate_call_before_statement();
        }
        if (hook.getType() === "after_response") {
          afterHooksCode += hook.generate_call_after_statement();
        }
        importHookStatement.add(hook.generate_import_statement());
      }
    }
    template = template.replace(`//BEFORE_CALL_ENDPOINT_${method}`, beforeHooksCode).replace(`//AFTER_CALL_ENDPOINT_${method}`, afterHooksCode);
  }
  const arrayImports = Array.from(importHookStatement);
  template = template.replace(`//IMPORT_HOOKS`, arrayImports.join(""));
  return template;
}

// src/core/endpoint/generate_endpoint.ts
async function generate_endpoint(endpoint) {
  let ret = get_endpoint_template();
  const regexToCaptureMethodTemplate = /(\/\/START_METHODS)(.*?)(\/\/END_METHODS)/s;
  let methodTemplate = ret.match(regexToCaptureMethodTemplate)?.[2];
  if (!methodTemplate) {
    throw new Error("Method template not found in endpoint template");
  }
  ret = ret.replace("//START_METHODS", "");
  ret = ret.replace("//END_METHODS", "");
  ret = ret.replace("/target", endpoint.getTarget());
  let methodsCode = "";
  for (const method of endpoint.getMethods()) {
    let methodCode = methodTemplate;
    methodCode = methodCode.replaceAll("METHOD", method).replace("//BEFORE_CALL_ENDPOINT", `//BEFORE_CALL_ENDPOINT_${method}`).replace("//AFTER_CALL_ENDPOINT", `//AFTER_CALL_ENDPOINT_${method}`);
    methodsCode += methodCode + `
`;
  }
  ret = ret.replace(methodTemplate, methodsCode);
  ret = await generate_endpoint_hooks(ret, endpoint);
  return ret;
}

// src/core/endpoint/Endpoint.ts
import { join as join3 } from "path";

// src/utilities/Global.ts
import { resolve, join } from "path";
var library_dir = resolve(import.meta.dir, "../../");
var resources_dir = join(library_dir, "resources");

// src/core/application/ApplicationPaths.ts
import { join as join2 } from "path";
function get_dass_generated_dir_source() {
  return join2(library_dir, "src", "generated");
}
function c_build_path() {
  return code_generated_dir() + "/c_compiled/libdass.so";
}
function server_path_generated() {
  return code_generated_dir() + "/ts/server.raw.ts";
}
function ffi_methods_path_generated() {
  return code_generated_dir() + "/ts/ffi_methods.raw.ts";
}
function code_generated_dir() {
  return join2(Application.cwd, "node_modules", "dass-generated");
}

// src/core/endpoint/Endpoint.ts
class Endpoint {
  target;
  methods;
  constructor(target, methods) {
    this.target = target;
    this.methods = methods;
  }
  getTarget() {
    return this.target;
  }
  getMethods() {
    return this.methods;
  }
  getFileName() {
    let ret = "routes_";
    ret += this.target.replaceAll("/", "_").replaceAll(":", "_").replaceAll("-", "_").replaceAll(" ", "_");
    return ret;
  }
  async write_endpoint_function() {
    return smartFileWriter(join3(code_generated_dir(), "ts", "routes", `${this.getFileName()}.ts`), await generate_endpoint(this));
  }
  generate_import_statement() {
    return `import ${this.getFileName()} from "./routes/${this.getFileName()}";`;
  }
  generate_registration_statement() {
    return `			...${this.getFileName()}(),`;
  }
}

// src/core/scanner/scan_endpoints.ts
async function scan_endpoints(files) {
  const returnedEndpoints = [];
  for (let i = 0;i < files.length; i++) {
    const file = files[i];
    if (!file)
      continue;
    const module = await import(file + `?update=${Date.now()}`);
    for (const exported of Object.values(module)) {
      if (typeof exported === "function") {
        const result = exported();
        if (result instanceof Endpoint) {
          returnedEndpoints.push(result);
        } else if (Array.isArray(result) && result.every((r) => r instanceof Endpoint)) {
          returnedEndpoints.push(...result);
        }
      }
    }
  }
  return returnedEndpoints;
}

// src/core/application/ApplicationObjects.ts
import path2 from "path";

// src/core/schema/field/Field.ts
class Field {
  fieldName;
  constructor(fieldName) {
    this.fieldName = fieldName;
  }
  getName() {
    return this.fieldName;
  }
}

// src/core/schema/field/NumberField.ts
class NumberField extends Field {
  constructor(fieldName) {
    super(fieldName);
  }
  getType() {
    return "number";
  }
  code_generator_ts_http_pre_call_POST() {
    return `const ${this.getName()} = parseInt(DAASRequest.requestData["${this.getName()}"] || "0");`;
  }
  code_generator_ts_http_call_params_POST() {
    return `${this.getName()}`;
  }
  code_generator_ts_http_post_call_POST() {
    return ``;
  }
  code_generator_ts_http_pre_call_PATCH() {
    return this.code_generator_ts_http_pre_call_POST();
  }
  code_generator_ts_http_call_params_PATCH() {
    return this.code_generator_ts_http_call_params_POST();
  }
  code_generator_ts_http_post_call_PATCH() {
    return this.code_generator_ts_http_post_call_POST();
  }
  code_generator_ts_create() {
    return `FFIType.u64`;
  }
  code_generator_ts_update() {
    return `FFIType.u64`;
  }
  code_generator_c_get_as_json() {
    return `
        	memcpy(json_output + json_cpt, "\\"${this.getName()}\\":", ${this.getName().length + 3});
            json_cpt += ${this.getName().length + 3};
            memcpy(json_output + json_cpt, "\\"", 1);
            json_cpt += 1;
            char ${this.getName()}_str[21];
            sprintf(${this.getName()}_str, "%lu", element->${this.getName()});
            memcpy(json_output + json_cpt, ${this.getName()}_str, strlen(${this.getName()}_str));
            json_cpt += strlen(${this.getName()}_str);
            memcpy(json_output + json_cpt++, "\\"", 1);
        `;
  }
  code_generator_c_struct() {
    return `	uint64_t ${this.getName()};`;
  }
  code_generator_c_create_param() {
    return `uint64_t ${this.getName()}`;
  }
  code_generator_c_create_raw_size() {
    return "";
  }
  code_generator_c_create_object() {
    return `	element->${this.getName()} = ${this.getName()};`;
  }
  code_generator_c_create_raw_data() {
    return "";
  }
  code_generator_c_update_params() {
    return this.code_generator_c_create_param();
  }
  code_generator_c_update_raw_size() {
    return this.code_generator_c_create_raw_size();
  }
  code_generator_c_update_object() {
    return this.code_generator_c_create_object();
  }
  code_generator_c_update_raw_data() {
    return this.code_generator_c_create_raw_data();
  }
}

// src/core/schema/field/StringField.ts
class StringField extends Field {
  constructor(fieldName) {
    super(fieldName);
  }
  getType() {
    return "string";
  }
  code_generator_ts_http_pre_call_POST() {
    return `
            const buffer${this.getName()} = bufferPool4096bytes.acquire();
            const length${this.getName()} = buffer${this.getName()}.write(DAASRequest.requestData["${this.getName()}"] || "");
        `;
  }
  code_generator_ts_http_call_params_POST() {
    return `length${this.getName()}, buffer${this.getName()}`;
  }
  code_generator_ts_http_post_call_POST() {
    return `bufferPool4096bytes.release(buffer${this.getName()});`;
  }
  code_generator_ts_http_pre_call_PATCH() {
    return this.code_generator_ts_http_pre_call_POST();
  }
  code_generator_ts_http_call_params_PATCH() {
    return this.code_generator_ts_http_call_params_POST();
  }
  code_generator_ts_http_post_call_PATCH() {
    return this.code_generator_ts_http_post_call_POST();
  }
  code_generator_ts_create() {
    return `FFIType.u32, FFIType.ptr`;
  }
  code_generator_ts_update() {
    return `FFIType.u32, FFIType.ptr`;
  }
  code_generator_c_struct() {
    return `	uint32_t ${this.getName()}_length;`;
  }
  code_generator_c_get_as_json() {
    return `
        	memcpy(json_output + json_cpt, "\\"${this.getName()}\\":", ${this.getName().length + 3});
            json_cpt += ${this.getName().length + 3};
            memcpy(json_output + json_cpt, "\\"", 1);
            json_cpt += 1;
            memcpy(json_output + json_cpt, &element->raw[raw_cpt], element->${this.getName()}_length);
            json_cpt += element->${this.getName()}_length;
            memcpy(json_output + json_cpt++, "\\"", 1);
        `;
  }
  code_generator_c_create_param() {
    return `uint32_t ${this.getName()}_length, char* ${this.getName()}`;
  }
  code_generator_c_create_raw_size() {
    return `${this.getName()}_length`;
  }
  code_generator_c_create_object() {
    return `	element->${this.getName()}_length = ${this.getName()}_length;`;
  }
  code_generator_c_create_raw_data() {
    return `
	memcpy(&element->raw[cpt_raw], ${this.getName()}, ${this.getName()}_length);
	cpt_raw += ${this.getName()}_length;
        `;
  }
  code_generator_c_update_params() {
    return this.code_generator_c_create_param();
  }
  code_generator_c_update_raw_size() {
    return this.code_generator_c_create_raw_size();
  }
  code_generator_c_update_object() {
    return this.code_generator_c_create_object();
  }
  code_generator_c_update_raw_data() {
    return this.code_generator_c_create_raw_data();
  }
}

// src/core/schema/Schema.ts
import path from "path";

// src/utilities/mapAndJoin.ts
function mapAndJoin(fields, separator, callback) {
  return fields.map(callback).filter((val) => val !== undefined && val !== null && val.trim() !== "").join(separator);
}

// src/core/schema/generator/c_schema_generator.ts
function c_schema_generator(schema) {
  let params, raw_size, create_object, create_raw_data, update_object, update_raw_data;
  let template = get_template_c();
  let struct = mapAndJoin(schema.getFields(), `
`, (f) => f.code_generator_c_struct());
  template = template.replaceAll("Template", schema.getName()).replaceAll("Template*", `${schema.getName()}*`).replaceAll("template", `${schema.getName().toLowerCase()}`).replace("static const uint16_t DEF_ZONE_ID = 0;//Generated", `static const uint16_t DEF_ZONE_ID = ${schema.getOptions().defaultZone};`).replace("static const uint16_t SCHEMA_ID   = 0;//Generated", `static const uint16_t SCHEMA_ID   = ${schema.getSchemaID()};`).replace("{{STRUCTS}}", struct);
  params = mapAndJoin(schema.getFields(), ", ", (f) => f.code_generator_c_create_param());
  raw_size = mapAndJoin(schema.getFields(), " + ", (f) => f.code_generator_c_create_raw_size());
  create_object = mapAndJoin(schema.getFields(), `
`, (f) => f.code_generator_c_create_object());
  create_raw_data = mapAndJoin(schema.getFields(), `
`, (f) => f.code_generator_c_create_raw_data());
  template = template.replace("{{CREATE_PARAMS}}", params + (params ? ", " : "")).replace("const uint64_t create_raw_size = 0;//Generated", `const uint64_t create_raw_size = ${raw_size};`).replace("{{CREATE_OBJECT}}", create_object).replace("{{CREATE_RAW_DATA}}", create_raw_data);
  params = mapAndJoin(schema.getFields(), ", ", (f) => f.code_generator_c_update_params());
  raw_size = mapAndJoin(schema.getFields(), " + ", (f) => f.code_generator_c_update_raw_size());
  update_object = mapAndJoin(schema.getFields(), `
`, (f) => f.code_generator_c_update_object());
  update_raw_data = mapAndJoin(schema.getFields(), `
`, (f) => f.code_generator_c_update_raw_data());
  template = template.replace("{{UPDATE_PARAMS}}", params + (params ? ", " : "")).replace("const uint64_t update_raw_size = 0;//Generated", `const uint64_t update_raw_size = ${raw_size};`).replace("{{UPDATE_OBJECT}}", update_object).replace("{{UPDATE_RAW_DATA}}", update_raw_data);
  let get_as_json = mapAndJoin(schema.getFields(), `
memcpy(json_output + json_cpt++, ",", 1);`, (f) => f.code_generator_c_get_as_json());
  template = template.replace("//{{GET_AS_JSON}}", get_as_json);
  return template;
}

// src/core/schema/generator/ts_ffi_methods_generator.ts
function ts_ffi_methods_generator(schema) {
  let args;
  let methods = "";
  args = mapAndJoin(schema.getFields(), ", ", (f) => f.code_generator_ts_create());
  methods += `
    create_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.u64],
        returns: FFIType.ptr,
    },
    `;
  args = mapAndJoin(schema.getFields(), ", ", (f) => f.code_generator_ts_update());
  methods += `
    update_${schema.getName().toLowerCase()}: {
        args: [${args}, FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },
    `;
  methods += `
    delete_${schema.getName().toLowerCase()}: {
        args: [FFIType.ptr, FFIType.u64],
        returns: FFIType.u32,
    },
    `;
  methods += `
    get_${schema.getName().toLowerCase()}: {
        args: [FFIType.ptr],
        returns: FFIType.ptr,
    },
    `;
  methods += `
    get_${schema.getName().toLowerCase()}_as_json: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.u32,
    },
    `;
  return methods;
}

// src/core/schema/Schema.ts
class Schema {
  name;
  fields;
  options;
  schemaID;
  constructor(name, schemaID, options) {
    this.name = name;
    this.fields = [];
    this.schemaID = schemaID;
    this.options = options || { defaultZone: 0 };
  }
  static create(name, schemaID, opts) {
    return new Schema(name, schemaID, opts);
  }
  String(fieldName) {
    this.fields.push(new StringField(fieldName));
    return this;
  }
  Number(fieldName) {
    this.fields.push(new NumberField(fieldName));
    return this;
  }
  getSchemaID() {
    return this.schemaID;
  }
  getName() {
    return this.name;
  }
  getFields() {
    return this.fields;
  }
  getOptions() {
    return this.options;
  }
  generate_get_as_json() {
    return "";
  }
  generate_ts_ffi_methods() {
    return ts_ffi_methods_generator(this);
  }
  async generate_c() {
    return smartFileWriter(path.join(code_generated_dir(), "c", `${this.name.toLowerCase()}.c`), c_schema_generator(this));
  }
}

// src/core/scanner/scan_schemas.ts
async function scan_schemas(files) {
  const returnedSchemas = [];
  for (let i = 0;i < files.length; i++) {
    const file = files[i];
    if (!file)
      continue;
    const module = await import(file + `?update=${Date.now()}`);
    for (const exported of Object.values(module)) {
      if (typeof exported === "function") {
        const result = exported();
        if (result instanceof Schema) {
          returnedSchemas.push(result);
        } else if (Array.isArray(result) && result.every((r) => r instanceof Schema)) {
          returnedSchemas.push(...result);
        }
      }
    }
  }
  return returnedSchemas;
}

// src/core/hooks/HookFunction.ts
class HookFunction {
  props;
  constructor(props) {
    this.props = props;
  }
  getFnName() {
    return this.props.fnName;
  }
  getIsDefaultExport() {
    return this.props.isDefaultExport;
  }
  getAbsolutePath() {
    return this.props.absolutePath;
  }
}

// src/core/scanner/scan_hook_functions.ts
async function scan_hook_functions(files) {
  const ret = [];
  for (let i = 0;i < files.length; i++) {
    const file = files[i];
    if (!file)
      continue;
    const module = await import(file + `?update=${Date.now()}`);
    for (const fn of Object.values(module)) {
      if (typeof fn != "function")
        continue;
      const isDefaultExport = fn == module.default;
      ret.push(new HookFunction({
        fnName: fn.name,
        isDefaultExport,
        absolutePath: file
      }));
    }
  }
  return ret;
}

// src/core/application/ApplicationObjects.ts
class ApplicationObjects {
  static glob = new Glob("**/*");
  static Hooks = [];
  static HookFunctions = new Map;
  static Endpoints = new Map;
  static Schemas = new Map;
  static getEndpoints() {
    const ret = [];
    const targets = ApplicationObjects.Endpoints.entries();
    targets.every((target) => {
      ret.push(new Endpoint(target[0], target[1].keys().toArray()));
    });
    return ret;
  }
  static getHooks() {
    return ApplicationObjects.Hooks;
  }
  static getSchemas() {
    return ApplicationObjects.Schemas.values().toArray();
  }
  static getHookFunction(name) {
    return ApplicationObjects.HookFunctions.get(name);
  }
  static register_hook(hook) {
    ApplicationObjects.Hooks.push(hook);
  }
  static async scan_endpoints() {
    ApplicationObjects.Endpoints.forEach((m) => m.clear());
    ApplicationObjects.Endpoints.clear();
    const scanRoot = path2.join(Application.cwd, DEFAULT_ENDPOINT_FOLDER);
    const files = Array.from(ApplicationObjects.glob.scanSync({
      cwd: scanRoot,
      onlyFiles: true,
      absolute: true
    }));
    const endpoints = await scan_endpoints(files);
    for (const endpoint of endpoints) {
      if (!ApplicationObjects.Endpoints.has(endpoint.getTarget())) {
        ApplicationObjects.Endpoints.set(endpoint.getTarget(), new Map);
      }
      const map = ApplicationObjects.Endpoints.get(endpoint.getTarget());
      for (const method of endpoint.getMethods()) {
        if (map.get(method)) {
          console.error("[ERROR] The Endpoint", endpoint.getTarget(), "for the method", method, "already exists, please remove it");
          continue;
        }
        map.set(method, true);
      }
    }
  }
  static async scan_schemas() {
    ApplicationObjects.Schemas.clear();
    const regex_validation_name = /[a-zA-Z0-9_-]{2,64}/;
    const scanRoot = path2.join(Application.cwd, DEFAULT_SCHEMA_FOLDER);
    const files = Array.from(ApplicationObjects.glob.scanSync({
      cwd: scanRoot,
      onlyFiles: true,
      absolute: true
    }));
    const schemas = await scan_schemas(files);
    for (const schema of schemas) {
      if (!regex_validation_name.test(schema.getName())) {
        console.error("[ERROR] The Schema name", schema.getName(), "is not valid, please check name");
        continue;
      }
      if (ApplicationObjects.Schemas.has(schema.getName())) {
        console.error("[ERROR] The Schema", schema.getName(), "already exists, please change name");
        continue;
      }
      ApplicationObjects.Schemas.set(schema.getName(), schema);
    }
  }
  static async scan_hook_functions() {
    ApplicationObjects.HookFunctions.clear();
    const directory_to_scan = path2.join(Application.cwd, DEFAULT_HOOK_FOLDER);
    const files = Array.from(ApplicationObjects.glob.scanSync({
      cwd: directory_to_scan,
      onlyFiles: true,
      absolute: true
    }));
    const hookFunctions = await scan_hook_functions(files);
    for (const hookFunction of hookFunctions) {
      if (ApplicationObjects.HookFunctions.has(hookFunction.getFnName())) {
        console.error("[ERROR] The Hook Function", hookFunction.getFnName(), "already exists, please change name");
        continue;
      }
      ApplicationObjects.HookFunctions.set(hookFunction.getFnName(), hookFunction);
    }
  }
}

// src/core/application/generator/generate_http_server.ts
async function generate_http_server() {
  let template = get_server_template();
  const promises = [];
  const endpoints = ApplicationObjects.getEndpoints();
  let imports_statement = "";
  let registration_statement = "";
  for (const endpoint of endpoints) {
    imports_statement += endpoint.generate_import_statement();
    registration_statement += endpoint.generate_registration_statement();
    promises.push(endpoint.write_endpoint_function());
  }
  template = template.replace("//{{ROUTES_IMPORTS}}", imports_statement).replace("//{{ROUTES_CALLS}}", registration_statement);
  promises.push(smartFileWriter(server_path_generated(), template));
  await Promise.all(promises);
  return;
}

// src/core/application/generator/generate_schemas.ts
async function generate_schemas() {
  const promises = [];
  const schemas = ApplicationObjects.getSchemas();
  let ffi_methods_template = get_ffi_methods_template();
  let ffi_methods = "";
  for (const schema of schemas) {
    promises.push(schema.generate_c());
    ffi_methods += schema.generate_ts_ffi_methods();
  }
  ffi_methods_template = ffi_methods_template.replace("//{{FFI_METHODS}}", ffi_methods).replace("{{PATH_C}}", c_build_path());
  promises.push(smartFileWriter(ffi_methods_path_generated(), ffi_methods_template));
  await Promise.all(promises);
  return;
}

// src/core/application/generator/generate_structure.ts
import { join as join4, relative } from "path";

// src/utilities/smartCopy.ts
import { readFileSync, writeFileSync, existsSync as existsSync2, mkdirSync as mkdirSync2 } from "fs";
import path3 from "path";
function smartCopy(src, dest) {
  if (existsSync2(dest)) {
    const srcBuf = readFileSync(src);
    const destBuf = readFileSync(dest);
    if (srcBuf.equals(destBuf)) {
      return;
    }
  }
  const destDir = path3.dirname(dest);
  if (!existsSync2(destDir))
    mkdirSync2(destDir, { recursive: true });
  writeFileSync(dest, readFileSync(src));
}

// src/core/application/generator/generate_structure.ts
var {Glob: Glob2 } = globalThis.Bun;
function generate_structure() {
  const glob = new Glob2("**/*");
  const files = Array.from(glob.scanSync({
    cwd: join4(resources_dir, "c"),
    onlyFiles: true,
    absolute: true
  }));
  for (let i = 0;i < files.length; i++) {
    smartCopy(files[i], join4(code_generated_dir(), "c", relative(join4(resources_dir, "c"), files[i])));
  }
  smartCopy(join4(get_dass_generated_dir_source(), "Makefile"), join4(code_generated_dir(), "Makefile"));
  smartCopy(join4(get_dass_generated_dir_source(), "ts", "utilities", "ObjectPool.ts"), join4(code_generated_dir(), "ts", "utilities", "ObjectPool.ts"));
  smartCopy(join4(get_dass_generated_dir_source(), "ts", "utilities", "baseDASSRequest.ts"), join4(code_generated_dir(), "ts", "utilities", "baseDASSRequest.ts"));
  smartCopy(join4(get_dass_generated_dir_source(), "ts", "application.ts"), join4(code_generated_dir(), "ts", "application.ts"));
  smartCopy(join4(get_dass_generated_dir_source(), "ts", "worker.ts"), join4(code_generated_dir(), "ts", "worker.ts"));
  smartCopy(join4(library_dir, "src", "types", "global.d.ts"), join4(code_generated_dir(), "index.d.ts"));
}

// src/core/application/Application.ts
var DASS_FOLDER = "./dass";
var DEFAULT_CONFIG_FOLDER = "./dass/config";
var DEFAULT_SCHEMA_FOLDER = "./dass/schema";
var DEFAULT_ENDPOINT_FOLDER = "./dass/endpoint";
var DEFAULT_HOOK_FOLDER = "./dass/hooks";

class Application {
  static cwd = process.cwd();
  static dev(cwd) {
    if (cwd) {
      Application.cwd = cwd;
    }
    generate_structure();
    let watchSchemas = watch(path4.join(Application.cwd, DASS_FOLDER), { recursive: true });
    watchSchemas.addListener("change", async () => {
      await Application.build();
      watchSchemas = watch(path4.join(Application.cwd, DASS_FOLDER), { recursive: true });
    });
    this.build();
  }
  static async build() {
    let promises;
    await process_with_timing("Scan resources", async () => {
      promises = [];
      promises.push(ApplicationObjects.scan_hook_functions());
      promises.push(ApplicationObjects.scan_endpoints());
      promises.push(ApplicationObjects.scan_schemas());
      await Promise.all(promises);
    });
    await process_with_timing("Build files", async () => {
      promises = [];
      promises.push(generate_http_server());
      promises.push(generate_schemas());
      await Promise.all(promises);
    });
    await process_with_timing("Compiling C library", () => {
      Bun.spawnSync(["make", "dev"], {
        cwd: code_generated_dir(),
        stdout: "ignore",
        stderr: "ignore"
      });
    });
    const module = await import(code_generated_dir() + "/ts/application.ts?u=" + Date.now());
    module.AppRunner();
  }
}
async function process_with_timing(str, cb) {
  let start, end, duration;
  start = Bun.nanoseconds();
  await cb();
  end = Bun.nanoseconds();
  duration = (end - start) / 1e6;
  console.log(`[INFO] ${str} in ${duration.toFixed(0)} milliseconds...`);
}
export {
  DEFAULT_SCHEMA_FOLDER,
  DEFAULT_HOOK_FOLDER,
  DEFAULT_ENDPOINT_FOLDER,
  DEFAULT_CONFIG_FOLDER,
  DASS_FOLDER,
  Application
};
