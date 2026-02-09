import type { Field } from "../Field/Field";

export function  mapAndJoin(fields: Field[], separator: string, callback: (field: any) => string): string {
    return fields
        .map(callback)
        .filter(val => val !== undefined && val !== null && val.trim() !== "")
        .join(separator);
}