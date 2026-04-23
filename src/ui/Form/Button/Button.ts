import { Component } from "../../Component";

import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class Button extends Component {
    static formAssociated = true;
    private _internals: ElementInternals;
    private _btn: HTMLButtonElement | null = null;

    constructor() {
        super({ css, template: template as unknown as string });
        this._internals = this.attachInternals();
    }

    // Observe changes to update the internal button
    static get observedAttributes() {
        return ['type', 'disabled', 'variant', 'color'];
    }

    override connectedCallback() {
        this._btn = this.shadowRoot?.querySelector('button') || null;
        this._upgradeProperty('disabled');
        
        // Default values if not defined
        if (!this.hasAttribute('type')) this.setAttribute('type', 'button');
        if (!this.hasAttribute('variant')) this.setAttribute('variant', 'filled');

        this.addEventListener('click', this._handleClick);
    }

    private _handleClick = (e: Event) => {
        if (this.hasAttribute('disabled')) {
            e.stopImmediatePropagation();
            return;
        }

        const form = this._internals.form;
        if (!form) return;

        const type = this.getAttribute('type');
        if (type === 'submit') form.requestSubmit();
        if (type === 'reset') form.reset();
    };

    // Helper to sync JS properties and HTML attributes
    private _upgradeProperty(prop: string) {
        if (this.hasOwnProperty(prop)) {
            let value = (this as any)[prop];
            delete (this as any)[prop];
            (this as any)[prop] = value;
        }
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (this._btn && name === 'type') this._btn.type = newVal as any;
        if (this._btn && name === 'disabled') this._btn.disabled = this.hasAttribute('disabled');
    }

    set disabled(val: boolean) {
        if (val) this.setAttribute('disabled', '');
        else this.removeAttribute('disabled');
    }
}

if (!customElements.get("p9r-button")) {
    customElements.define("p9r-button", Button);
}