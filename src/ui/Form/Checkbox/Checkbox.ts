import { Component } from "../../Component";

import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class Checkbox extends Component {

    static formAssociated = true;
    private _internals: ElementInternals;
    private _input: HTMLInputElement | null = null;

    constructor(){
        super({
            css,
            template: template as unknown as string
        })
        this._internals = this.attachInternals();
    }

    override connectedCallback() {
        this._input = this.shadowRoot?.querySelector('input') || null;

        if (this._input) {
            this._input.addEventListener('change', () => {
                this.checked = this._input?.checked || false;
                this.dispatchEvent(new Event('change', { bubbles: true }));
            });

            this.checked = this.hasAttribute('checked');
            if (this.hasAttribute('disabled')) this._input.disabled = true;
        }
    }

    get checked() { return this._input?.checked || false; }
    set checked(val: boolean) {
        if (this._input) {
            this._input.checked = val;
            this._internals.setFormValue(val ? (this.getAttribute('value') || 'on') : null);
        }
    }

    override click() {
        this._input?.click();
    }
}

if ( !customElements.get("w13c-checkbox") ){
    customElements.define("w13c-checkbox", Checkbox);
}