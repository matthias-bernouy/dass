import { Component } from "../../Component";
import "./LateralMenuItem/LateralMenuItem"

import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class LateralMenu extends Component {
    constructor(){
        super({
            css,
            template: template as unknown as string
        })
    }

    // Toggle the sidebar menu
    toggle() {
        const sidebar = this.shadowRoot?.querySelector('.sidebar');
        sidebar?.classList.toggle('collapsed');
    }
}

customElements.define("w13c-lateral-menu", LateralMenu);