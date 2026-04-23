import { Component } from "../../Component";

import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class LeftMenuLayout extends Component {
    constructor(){
        super({
            css,
            template: template as unknown as string
        })
    }
}

customElements.define("w13c-left-menu-layout", LeftMenuLayout);