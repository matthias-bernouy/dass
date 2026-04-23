/**
 * <p9r-range name="radius" label="Arrondi" min="0" max="32" step="1" value="16" unit="px"></p9r-range>
 */
export class P9rRange extends HTMLElement {

    private _slider: HTMLInputElement | null = null;
    private _input: HTMLInputElement | null = null;
    private _fill: HTMLElement | null = null;
    private _value = 0;

    connectedCallback() {
        this._render();
        this._syncFill();
    }

    private _render() {
        const label = this.getAttribute("label") || this.getAttribute("name") || "";
        const min = this.getAttribute("min") || "0";
        const max = this.getAttribute("max") || "100";
        const step = this.getAttribute("step") || "1";
        const value = this.getAttribute("value") || min;
        const unit = this.getAttribute("unit") || "";

        this._value = Number(value);

        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
            <style>${P9rRange._css}</style>
            <div class="field">
                <div class="header">
                    <span class="label">${label}</span>
                    <div class="input-wrap">
                        <input class="number" type="number"
                               min="${min}" max="${max}" step="${step}" value="${value}">
                        ${unit ? `<span class="unit">${unit}</span>` : ""}
                    </div>
                </div>
                <div class="track-container">
                    <div class="track">
                        <div class="fill"></div>
                    </div>
                    <input class="slider" type="range"
                           min="${min}" max="${max}" step="${step}" value="${value}">
                </div>
                <div class="bounds">
                    <span>${min}</span>
                    <span>${max}</span>
                </div>
            </div>
        `;

        this._slider = shadow.querySelector(".slider")!;
        this._input = shadow.querySelector(".number")!;
        this._fill = shadow.querySelector(".fill")!;

        this._slider.addEventListener("input", () => {
            this._value = Number(this._slider!.value);
            this._input!.value = this._slider!.value;
            this._syncFill();
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });

        this._input.addEventListener("input", () => {
            let v = Number(this._input!.value);
            const mn = Number(min);
            const mx = Number(max);
            if (v < mn) v = mn;
            if (v > mx) v = mx;
            this._value = v;
            this._slider!.value = String(v);
            this._syncFill();
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });

        this._input.addEventListener("blur", () => {
            this._input!.value = String(this._value);
        });
    }

    private _syncFill() {
        if (!this._slider || !this._fill) return;
        const min = Number(this._slider.min);
        const max = Number(this._slider.max);
        const pct = ((this._value - min) / (max - min)) * 100;
        this._fill.style.width = `${pct}%`;
    }

    get value() { return String(this._value); }
    set value(v: string) {
        this._value = Number(v);
        if (this._slider) this._slider.value = v;
        if (this._input) this._input.value = v;
        this._syncFill();
    }

    get name() { return this.getAttribute("name"); }

    private static _css = `
        :host {
            display: block;
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-muted, #94a3b8);
        }

        .input-wrap {
            display: flex;
            align-items: center;
            gap: 2px;
            background: var(--bg-surface, #fff);
            border: 1px solid var(--border-default, #e2e8f0);
            border-radius: 6px;
            padding: 2px 6px;
            transition: border-color 0.15s;
        }

        .input-wrap:focus-within {
            border-color: var(--primary-base, #4361ee);
        }

        .number {
            width: 36px;
            border: none;
            outline: none;
            background: transparent;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-main, #1e293b);
            text-align: right;
            font-family: inherit;
            -moz-appearance: textfield;
        }

        .number::-webkit-inner-spin-button,
        .number::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .unit {
            font-size: 10px;
            font-weight: 500;
            color: var(--text-muted, #94a3b8);
        }

        /* ── Track ── */

        .track-container {
            position: relative;
            height: 20px;
            display: flex;
            align-items: center;
        }

        .track {
            position: absolute;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--border-default, #e2e8f0);
            border-radius: 4px;
            overflow: hidden;
            pointer-events: none;
        }

        .fill {
            height: 100%;
            background: var(--primary-base, #4361ee);
            border-radius: 4px;
            transition: width 0.05s ease;
        }

        .slider {
            position: relative;
            width: 100%;
            height: 20px;
            margin: 0;
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
            z-index: 1;
        }

        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--primary-base, #4361ee);
            border: 2px solid var(--bg-surface, #fff);
            box-shadow: 0 1px 4px rgb(0 0 0 / 0.15);
            cursor: grab;
            transition: transform 0.1s;
        }

        .slider::-webkit-slider-thumb:active {
            transform: scale(1.2);
            cursor: grabbing;
        }

        .slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--primary-base, #4361ee);
            border: 2px solid var(--bg-surface, #fff);
            box-shadow: 0 1px 4px rgb(0 0 0 / 0.15);
            cursor: grab;
        }

        .slider::-moz-range-track {
            background: transparent;
            border: none;
        }

        /* ── Bounds ── */

        .bounds {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            font-weight: 500;
            color: var(--text-muted, #94a3b8);
            margin-top: -2px;
        }
    `;
}

if (!customElements.get("p9r-range")) {
    customElements.define("p9r-range", P9rRange);
}
