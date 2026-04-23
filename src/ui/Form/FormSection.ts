import { Component } from "../Component";

export class FormSection extends Component {

    private _collapsed = false;

    constructor() {
        super();
    }

    override connectedCallback() {
        this._collapsed = this.hasAttribute("data-collapsed");
        this.render();
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-bottom: 8px;
                }

                .section-container {
                    border-radius: 10px;
                    background: var(--bg-surface, #fff);
                    border: 1px solid var(--border-default, #e5e7eb);
                }

                header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 14px;
                    cursor: pointer;
                    user-select: none;
                    transition: background 0.15s;
                }

                header:hover {
                    background: var(--bg-base, #f9fafb);
                }

                .accent-bar {
                    width: 3px;
                    height: 14px;
                    background: var(--primary-base, #6366f1);
                    border-radius: 4px;
                    flex-shrink: 0;
                }

                .title-wrapper {
                    flex: 1;
                    color: var(--text-main, #111827);
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .chevron {
                    width: 16px;
                    height: 16px;
                    color: var(--text-muted, #9ca3af);
                    transition: transform 0.2s ease;
                    flex-shrink: 0;
                }

                :host(.collapsed) .chevron {
                    transform: rotate(-90deg);
                }

                .content {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 4px 14px 14px;
                    border-top: 1px solid var(--border-default, #e5e7eb);
                    padding: 1rem;
                }

                :host(.collapsed) .content {
                    display: none;
                }

                .content ::slotted(*) {
                    width: 100%;
                }
            </style>

            <section class="section-container">
                <header id="toggle">
                    <div class="accent-bar"></div>
                    <div class="title-wrapper">${this.getAttribute("data-title") ?? ""}</div>
                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </header>
                <main class="content">
                    <slot></slot>
                </main>
            </section>
        `;

        if (this._collapsed) this.classList.add("collapsed");

        this.shadowRoot!.getElementById("toggle")!.addEventListener("click", () => {
            this._collapsed = !this._collapsed;
            this.classList.toggle("collapsed", this._collapsed);
        });
    }
}

if (!customElements.get("p9r-section")) {
    customElements.define("p9r-section", FormSection);
}
