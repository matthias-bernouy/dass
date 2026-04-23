export class TableCell extends HTMLElement {
    static get observedAttributes() { return ['variant']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const variant = this.getAttribute('variant'); // ex: success, danger
        const color = variant ? `var(--${variant}-base)` : 'var(--text-body)';
        
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: table-cell;
                        padding: 12px 20px;
                        vertical-align: middle;
                        color: ${color};
                        font-size: 14px;
                    }
                </style>
                <slot></slot>
            `;
        }
    }
}

customElements.define("p9r-cell", TableCell);