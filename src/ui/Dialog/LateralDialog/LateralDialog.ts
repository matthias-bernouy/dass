import { Component } from "../../Component";

import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class LateralDialog extends Component {

    private dialog: HTMLDialogElement;

    constructor() {
        super({
            css,
            template: template as unknown as string
        });

        this.dialog = this.shadowRoot?.querySelector("dialog")!;
    }

    override connectedCallback() {
        this.dialog.addEventListener('click', (event) => {
            if (event.target === this.dialog) {
                this.close();
            }
        });
    }

    show() {
        this.dialog.showModal();
    }

    close() {
        this.dialog.close();
    }

}

if ( !customElements.get("w13c-lateral-dialog") ){
    customElements.define("w13c-lateral-dialog", LateralDialog);
}
