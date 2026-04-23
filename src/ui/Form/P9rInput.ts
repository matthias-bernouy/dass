/**
 * <p9r-input name="title" label="Title" placeholder="…" max-count="50" hint="…"></p9r-input>
 *
 * Canonical text input for every admin form. Wraps a native <input> in shadow
 * DOM with a compact uppercase label, a hint row, and an optional character
 * counter. Form-associated via ElementInternals so native form submission sees
 * the value. Exposes `.value` (get/set) and methods `setHint(level, text)` and
 * `setInvalid(bool)` for dynamic validation.
 *
 * Events: bubbles `input` and `change` from the inner native input; they cross
 * the shadow boundary automatically because both are `composed: true` by spec.
 */
export class P9rInput extends HTMLElement {

    static formAssociated = true;

    static get observedAttributes() {
        return [
            "value",
            "label",
            "placeholder",
            "type",
            "hint",
            "hint-level",
            "max-count",
            "invalid",
            "disabled",
            "required",
        ];
    }

    private _internals: ElementInternals;
    private _input!: HTMLInputElement;
    private _labelEl!: HTMLLabelElement;
    private _hintEl!: HTMLElement;
    private _metaEl!: HTMLElement;
    private _counterEl!: HTMLElement;
    private _countEl!: HTMLElement;
    private _maxEl!: HTMLElement;

    constructor() {
        super();
        this._internals = this.attachInternals();
        this._buildShadow();
    }

    connectedCallback() {
        this._input.addEventListener("input", () => {
            this._internals.setFormValue(this._input.value);
            this._updateCounter();
        });

        // Sync every observed attribute once on connect. attributeChangedCallback
        // may have fired before _input existed during upgrade, so we can't rely
        // on it alone.
        this._syncLabel();
        this._syncPlaceholder();
        this._syncType();
        this._syncDisabled();
        this._syncRequired();
        this._syncHint();
        this._syncHintLevel();
        this._syncInvalid();
        this._syncMaxCount();

        const initialValue = this.getAttribute("value");
        if (initialValue !== null) this.value = initialValue;
        else this._updateCounter();
    }

    attributeChangedCallback(name: string, _old: string | null, next: string | null) {
        if (!this._input) return;
        switch (name) {
            case "value":       if (next !== null) this.value = next; break;
            case "label":       this._syncLabel(); break;
            case "placeholder": this._syncPlaceholder(); break;
            case "type":        this._syncType(); break;
            case "disabled":    this._syncDisabled(); break;
            case "required":    this._syncRequired(); break;
            case "hint":        this._syncHint(); break;
            case "hint-level":  this._syncHintLevel(); break;
            case "invalid":     this._syncInvalid(); break;
            case "max-count":   this._syncMaxCount(); this._updateCounter(); break;
        }
    }

    get value(): string { return this._input?.value ?? ""; }
    set value(v: string) {
        if (!this._input) return;
        this._input.value = v;
        this._internals.setFormValue(v);
        this._updateCounter();
    }

    get name(): string { return this.getAttribute("name") ?? ""; }

    get disabled(): boolean { return this._input?.disabled ?? false; }
    set disabled(v: boolean) {
        if (!this._input) return;
        this._input.disabled = v;
        if (v) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    override focus() { this._input?.focus(); }

    setHint(level: "info" | "error" | "success", text: string) {
        this._hintEl.textContent = text;
        this._hintEl.dataset.level = level;
        this._refreshMetaVisibility();
    }

    setInvalid(invalid: boolean) {
        if (invalid) {
            this._input.setAttribute("aria-invalid", "true");
            this.setAttribute("invalid", "");
        } else {
            this._input.removeAttribute("aria-invalid");
            this.removeAttribute("invalid");
        }
    }

    // ── Shadow DOM construction ────────────────────────────────────────
    private _buildShadow() {
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
            <style>${P9rInput._css}</style>
            <div class="field">
                <label class="label"></label>
                <input class="input" type="text" />
                <div class="meta" hidden>
                    <small class="hint"></small>
                    <small class="counter" hidden data-over="false"><span class="count">0</span>/<span class="max">0</span></small>
                </div>
            </div>
        `;
        this._labelEl = shadow.querySelector(".label") as HTMLLabelElement;
        this._input   = shadow.querySelector(".input") as HTMLInputElement;
        this._hintEl  = shadow.querySelector(".hint") as HTMLElement;
        this._metaEl  = shadow.querySelector(".meta") as HTMLElement;
        this._counterEl = shadow.querySelector(".counter") as HTMLElement;
        this._countEl   = shadow.querySelector(".count") as HTMLElement;
        this._maxEl     = shadow.querySelector(".max") as HTMLElement;
    }

    // ── Attribute → inner state sync helpers ──────────────────────────
    private _syncLabel() {
        const text = this.getAttribute("label") ?? "";
        this._labelEl.textContent = text;
        this._labelEl.hidden = text === "";
    }

    private _syncPlaceholder() {
        const v = this.getAttribute("placeholder");
        if (v === null) this._input.removeAttribute("placeholder");
        else this._input.setAttribute("placeholder", v);
    }

    private _syncType() {
        const v = this.getAttribute("type") ?? "text";
        this._input.setAttribute("type", v);
    }

    private _syncDisabled() {
        this._input.disabled = this.hasAttribute("disabled");
    }

    private _syncRequired() {
        this._input.required = this.hasAttribute("required");
    }

    private _syncHint() {
        this._hintEl.textContent = this.getAttribute("hint") ?? "";
        this._refreshMetaVisibility();
    }

    private _syncHintLevel() {
        const level = this.getAttribute("hint-level") ?? "info";
        this._hintEl.dataset.level = level;
    }

    private _syncInvalid() {
        if (this.hasAttribute("invalid")) this._input.setAttribute("aria-invalid", "true");
        else this._input.removeAttribute("aria-invalid");
    }

    private _syncMaxCount() {
        const max = this._parseMaxCount();
        if (max === null) {
            this._counterEl.hidden = true;
        } else {
            this._counterEl.hidden = false;
            this._maxEl.textContent = String(max);
        }
        this._refreshMetaVisibility();
    }

    private _parseMaxCount(): number | null {
        const raw = this.getAttribute("max-count");
        if (raw === null) return null;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }

    private _updateCounter() {
        const max = this._parseMaxCount();
        if (max === null) return;
        const len = this._input.value.length;
        this._countEl.textContent = String(len);
        this._counterEl.dataset.over = String(len > max);
    }

    private _refreshMetaVisibility() {
        const hasHint = (this._hintEl.textContent ?? "").length > 0;
        const hasCounter = !this._counterEl.hidden;
        this._metaEl.hidden = !hasHint && !hasCounter;
    }

    private static _css = `
        :host {
            display: block;
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            position: relative;
        }

        .label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-muted, #94a3b8);
        }

        .label[hidden] {
            display: none;
        }

        .input {
            width: 100%;
            padding: 7px 10px;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-main, #1e293b);
            font-family: inherit;
            border: 1px solid var(--border-default, #e2e8f0);
            border-radius: 8px;
            background: var(--bg-surface, #fff);
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .input::placeholder {
            color: var(--text-muted, #94a3b8);
            font-weight: 400;
        }

        .input:hover:not(:disabled) {
            border-color: var(--text-muted, #94a3b8);
        }

        .input:focus {
            border-color: var(--primary-base, #4361ee);
            box-shadow: 0 0 0 3px var(--primary-muted, rgb(67 97 238 / 0.15));
        }

        .input[aria-invalid="true"] {
            border-color: var(--danger-base, #ef4444);
        }

        .input[aria-invalid="true"]:focus {
            box-shadow: 0 0 0 3px rgb(239 68 68 / 0.15);
        }

        .input:disabled {
            background: var(--bg-base, #f1f5f9);
            color: var(--text-muted, #94a3b8);
            cursor: not-allowed;
        }

        .meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }

        .meta[hidden] {
            display: none;
        }

        .hint {
            font-size: 11px;
            color: var(--text-muted, #94a3b8);
            line-height: 1.4;
            flex: 1;
            min-width: 0;
        }

        .hint[data-level="error"] {
            color: var(--danger-base, #ef4444);
        }

        .hint[data-level="success"] {
            color: var(--success-base, #10b981);
        }

        .counter {
            font-size: 11px;
            color: var(--text-muted, #94a3b8);
            font-variant-numeric: tabular-nums;
            flex-shrink: 0;
        }

        .counter[hidden] {
            display: none;
        }

        .counter[data-over="true"] {
            color: var(--danger-base, #ef4444);
            font-weight: 600;
        }
    `;
}

if (!customElements.get("p9r-input")) {
    customElements.define("p9r-input", P9rInput);
}
