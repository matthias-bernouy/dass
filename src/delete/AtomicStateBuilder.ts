import Template from "./Template.txt";

type FieldType =
	| "int8"
	| "uint8"
	| "int16"
	| "uint16"
	| "int32"
	| "uint32"
	| "int64"
	| "uint64"
	| "float32"
	| "float64"
	| "string";

const TYPE_MAP: Record<FieldType, { size: number; get: string; set: string, ret: string }> =
{
	int8: { size: 1, get: "getInt8", set: "setInt8", ret: "number" },
	uint8: { size: 1, get: "getUint8", set: "setUint8", ret: "number" },
	int16: { size: 2, get: "getInt16", set: "setInt16", ret: "number" },
	uint16: { size: 2, get: "getUint16", set: "setUint16", ret: "number" },
	int32: { size: 4, get: "getInt32", set: "setInt32", ret: "number" },
	uint32: { size: 4, get: "getUint32", set: "setUint32", ret: "number" },
	int64: { size: 8, get: "getBigInt64", set: "setBigInt64", ret: "bigint" },
	uint64: { size: 8, get: "getBigUint64", set: "setBigUint64", ret: "bigint" },
	float32: { size: 4, get: "getFloat32", set: "setFloat32", ret: "number" },
	float64: { size: 8, get: "getFloat64", set: "setFloat64", ret: "number" },
	string: { size: 1, get: "getUint8", set: "setUint8", ret: "string" },
};

interface FieldDefinition {
	name: string;
	type: FieldType;
	offset: number;
	length?: number;
}

export class AtomicStateBuilder {
	private fields: FieldDefinition[] = [];
	private currentOffset = 0;
	private maxAlignment = 1;

	field(name: string, type: FieldType, length?: number) {
		if (length !== undefined && length <= 0) {
			throw new Error(
				`[Builder] Le champ "${name}" doit avoir une longueur positive.`,
			);
		}
		const { size } = TYPE_MAP[type];
		this.align(size);
		this.fields.push({ name, type, offset: this.currentOffset + 4, length });
		this.currentOffset += size * (length ?? 1);
		if (size > this.maxAlignment) this.maxAlignment = size;
		return this;
	}

	struct(name: string, builder: AtomicStateBuilder) {
		this.align(builder.maxAlignment);
		builder.fields.forEach((f) => {
			this.fields.push({
				...f,
				name: `${name}_${f.name}`,
				offset: this.currentOffset + 4 + (f.offset - 4),
			});
		});
		this.currentOffset += builder.currentOffset;
		if (builder.maxAlignment > this.maxAlignment)
			this.maxAlignment = builder.maxAlignment;
		return this;
	}

	private sizeOfDocument(): number {
		let base = 4;
		this.fields.forEach((f) => {
			const elementSize = TYPE_MAP[f.type].size;
			base += elementSize * (f.length ?? 1); // Multiplication indispensable ici
		});
		const GLOBAL_ALIGNMENT = 32;
		const padding =
			(GLOBAL_ALIGNMENT - (base % GLOBAL_ALIGNMENT)) % GLOBAL_ALIGNMENT;
		base += padding;
		return base;
	}

	private align(size: number) {
		const padding = (size - (this.currentOffset % size)) % size;
		this.currentOffset += padding;
	}

	private getTypedArray() {
		return {
			int8: "Int8Array",
			uint8: "Uint8Array",
			int16: "Int16Array",
			uint16: "Uint16Array",
			int32: "Int32Array",
			uint32: "Uint32Array",
			int64: "BigInt64Array",
			uint64: "BigUint64Array",
			float32: "Float32Array",
			float64: "Float64Array",
			string: "Uint8Array",
		};
	}

	private generateGetMethod(field: FieldDefinition): string {
		const config = TYPE_MAP[field.type];
		const endian = config.size > 1 ? ", true" : "";

		const arrayType = this.getTypedArray()[field.type];
		if (field.type === "string") {
			return `
    get ${field.name}(): ${config.ret} {
        const arr = new Uint8Array(this._view.buffer, this._view.byteOffset + this._offset + ${field.offset}, ${field.length ?? 1});
        const end = arr.indexOf(0);
        return new TextDecoder().decode(end === -1 ? arr : arr.subarray(0, end));
    }`;
		}
		if (field.length) {
			return `
get ${field.name}(): ${arrayType} {
    return new ${arrayType}(
        this._view.buffer,
        this._view.byteOffset + this._offset + ${field.offset},
        ${field.length}
    );
}
        `;
		}
		return `
get ${field.name}(): ${config.ret} {
    return this._view.${config.get}(this._offset + ${field.offset}${endian});
}
        `;
	}

	private generateSetMethod(field: FieldDefinition): string {
		const config = TYPE_MAP[field.type];
		const endian = config.size > 1 ? ", true" : "";
		const arrayType = this.getTypedArray()[field.type];
		if (field.type === "string") {
			return `
    set ${field.name}(v: ${config.ret}) {
        const arr = new Uint8Array(this._view.buffer, this._view.byteOffset + this._offset + ${field.offset}, ${field.length ?? 1});
        arr.fill(0); // On nettoie l'ancien contenu
        const encoded = new TextEncoder().encode(v);
        // On copie en s'assurant de ne pas déborder (on garde 1 octet pour le \0 si besoin, ou on tronque)
        arr.set(encoded.subarray(0, ${field.length ?? 1}));
    }`;
		}
		if (field.length) {
			return `
    set ${field.name}(v: ${arrayType} | ${config.ret}[]) {
        if (v.length > ${field.length}) {
            throw new Error(\`[AtomicState] Array overflow for "${field.name}": expected ${field.length}, got \${v.length}\`);
        }
        const array = new ${arrayType}(this._view.buffer, this._view.byteOffset + this._offset + ${field.offset}, ${field.length});
        array.set(v);
    }`;
		}
		return `
            set ${field.name}(v: ${config.ret}) {
                this._view.${config.set}(this._offset + ${field.offset}, v${endian});
            }
        `;
	}

	private generateMethods(): string {
		return this.fields
			.map((f) => {
				return this.generateGetMethod(f) + this.generateSetMethod(f);
			})
			.join("\n");
	}

	async generate(className: string): Promise<string> {
		let template = Template;

		template = template.replaceAll("Template", `${className}`);
		template = template.replace(
			"DOCUMENT_SIZE = 32;",
			`DOCUMENT_SIZE = ${this.sizeOfDocument()};`,
		);

		const methods = this.generateMethods();

		template = template.replace("// Methods will be inserted here", methods);

		return template;
	}
}
