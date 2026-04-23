import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };
import { Component } from "../Component";

export class HorizontalActionGroup extends Component {

    static _event = "action-click";

    constructor() {
        super({
            css,
            template: template as unknown as string
        });
    }

    override connectedCallback() {
        // Listen for all clicks inside the component
        this.addEventListener('click', (e: Event) => {
            // Find if the clicked element (or one of its parents) is a data-action button
            const target = e.target as HTMLElement;
            const actionItem = target.closest("[data-action]");
            
            if (actionItem) {
                e.stopPropagation();
                const actionName = actionItem.getAttribute('data-action');
                this.dispatchAction(actionName, actionItem);
            }
        });
    }

    private dispatchAction(name: string | null, element: Element) {
        this.dispatchEvent(new CustomEvent('action-click', {
            detail: {
                action: name,
                originalEvent: event,
                target: element
            },
            bubbles: true,
            composed: true
        }));
    }
}

if (!customElements.get("p9r-horizontal-action-group")) {
    customElements.define("p9r-horizontal-action-group", HorizontalActionGroup);
}