// GENERATED CODE - DO NOT MODIFY

import { AtomicSharedIdentitymap } from "../lib/native_bridge/daas-identity-map";

export class User {

	private static _pool: User[] = [];

	private static emailIdentityMap: AtomicSharedIdentitymap;
	private static phoneIdentityMap: AtomicSharedIdentitymap;

	static readonly DOCUMENT_SIZE = 32; // bytes

	static initMemory(nb: number): SharedArrayBuffer {
		User.emailIdentityMap = new AtomicSharedIdentitymap("email");
		User.phoneIdentityMap = new AtomicSharedIdentitymap("phone");
		return new SharedArrayBuffer(nb * User.DOCUMENT_SIZE);
	}

	static init(buffer: SharedArrayBuffer) {
		Template._sharedBuffer = buffer;
		Template._int32View = new Int32Array(buffer);
	}

	private static _sharedBuffer: SharedArrayBuffer;
	private static _int32View: Int32Array;

	private _view: DataView;
	private _offset: number = 0;

	static find(index: number): Template {
		const instance = Template._pool.pop() ?? new Template();
		return instance.find(index);
	}

	find(index: number): this {
		this._offset = index * Template.DOCUMENT_SIZE;
		return this;
	}

	release(): void {
		Template._pool.push(this);
	}

	constructor() {
		if (!Template._sharedBuffer) throw new Error("Template not initialized");
		this._view = new DataView(Template._sharedBuffer);
	}

	async lockDocument(): Promise<void> {
		while (true) {
			if (
				Atomics.compareExchange(Template._int32View, this._offset / 4, 0, 1) ===
				0
			) {
				return;
			}

			const result = Atomics.waitAsync(
				Template._int32View,
				this._offset / 4,
				1,
			);

			if (result.value === "not-equal") {
				continue;
			}

			await result.value;
		}
	}

	lockDocumentSync(): void {
		while (true) {
			const res = Atomics.compareExchange(
				Template._int32View,
				this._offset / 4,
				0,
				1,
			);
			if (res === 0) return;
			Atomics.wait(Template._int32View, this._offset / 4, 1);
		}
	}

	unlockDocument(): void {
		Atomics.store(Template._int32View, this._offset / 4, 0);
		Atomics.notify(Template._int32View, this._offset / 4, 1);
	}

	get isLocked(): boolean {
		return Atomics.load(Template._int32View, this._offset / 4) === 1;
	}

	// Methods will be inserted here
}
