export class TableRow extends HTMLElement {
    // Observe 'target' and 'href' for URL navigation
    static get observedAttributes() { return ['target', 'href']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.addEventListener('click', this.handleClick);
    }

    private handleClick = () => {
        const href = this.getAttribute('href');
        const target = this.getAttribute('target');

        if (href) {
            if (target === '_blank') {
                window.open(href, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = href;
            }
        }
    }

    connectedCallback() {
        this.render();
        if (this.hasAttribute('href')) {
            this.setAttribute('tabindex', '0');
            this.setAttribute('role', 'link'); // For screen readers
        }
    }

    render() {
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: table-row;
                        transition: background-color 0.15s ease;
                    }
                    /* Show pointer cursor for links */
                    :host([href]) {
                        cursor: pointer;
                    }
                    :host(:focus-visible) {
                        outline: 2px inset var(--primary-base);
                    }
                </style>
                <slot></slot>
            `;
        }
    }
}

customElements.define("p9r-row", TableRow);