import { Component } from "../Component";

import html from './Tag.template.html' with { type: 'text' };
import css from './Tag.style.css' with { type: 'text' };

export class Tag extends Component {

  static get observedAttributes() {
    return [];
  }

  constructor() {
    super({
      css: css,
      template: html as unknown as string
    });
  }

}

if (!customElements.get("p9r-tag")) {
    customElements.define("p9r-tag", Tag);
}