//@ts-nocheck

import SERVER_TEMPLATE from "src/generated/ts/server.raw" with { type: "text" };
import TEMPLATE_FFI_METHODS from "src/generated/ts/ffi_methods.raw" with { type: "text" };
import TEMPLATE_ENDPOINT from "src/generated/ts/endpoint/endpoint.raw" with { type: "text" };
import TEMPLATE_C from "src/generated/c/C_DOCUMENT_TEMPLATE.c" with { type: "text" };

export function get_server_template(): string {
    return SERVER_TEMPLATE as unknown as string;
}

export function get_ffi_methods_template(): string {
    return TEMPLATE_FFI_METHODS as unknown as string;
}

export function get_endpoint_template(): string {
    return TEMPLATE_ENDPOINT as unknown as string;
}

export function get_template_c(): string {
    return TEMPLATE_C as unknown as string;
}