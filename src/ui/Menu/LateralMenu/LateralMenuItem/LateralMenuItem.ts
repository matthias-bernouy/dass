import { Component } from "../../../Component";
import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class LateralMenuItem extends Component {

    constructor() {
        super({
            css,
            template: template as unknown as string
        });
    }

    static get observedAttributes(): string[] {
        return ['href', 'badge'];
    }

    private get anchor(): HTMLAnchorElement | null {
        return this.shadowRoot?.querySelector('a') || null;
    }

    override connectedCallback(): void {
        const href = this.getAttribute('href');
        this.updateHref(href);

        this.checkActiveState();

        window.addEventListener('popstate', this.checkActiveState);
    }

    disconnectedCallback(): void {
        window.removeEventListener('popstate', this.checkActiveState);
    }

    attributeChangedCallback(name: string, _old: string, newValue: string | null): void {
        if (name === 'href') this.updateHref(newValue);
        if (name === 'badge') this.updateBadge(newValue);
    }
    private updateHref(value: string | null): void {
        if (this.anchor) {
            value ? this.anchor.setAttribute('href', value) : this.anchor.removeAttribute('href');
        }
    }

    /**
     * Compares the item's href with the current URL to determine active state
     */
    private checkActiveState = (): void => {
        if (!this.anchor || !this.hasAttribute('href')) return;

        const hrefAttr = this.getAttribute('href')!;

        try {
            const resolvedURL = new URL(hrefAttr, window.location.href);
            const currentURL = new URL(window.location.href);

            const currentPath = currentURL.pathname;
            const targetPath = resolvedURL.pathname;
            const isActive = targetPath === '/'
                ? currentPath === '/'
                : currentPath === targetPath || currentPath.startsWith(targetPath + '/');
            if (isActive) {
                this.setAttribute('active', '');
                this.anchor.classList.add('active');
            } else {
                this.removeAttribute('active');
                this.anchor.classList.remove('active');
            }
        } catch (e) {
            // Invalid href fallback
            console.warn('Invalid href in LateralMenuItem:', hrefAttr);
        }
    }

    private updateBadge(value: string | null): void {
        const badgeEl = this.shadowRoot?.getElementById('badge-element');
        if (badgeEl) {
            if (value) {
                badgeEl.textContent = value;
                badgeEl.style.display = 'inline-flex';
            } else {
                badgeEl.style.display = 'none';
            }
        }
    }
}

customElements.define("w13c-lateral-menu-item", LateralMenuItem);