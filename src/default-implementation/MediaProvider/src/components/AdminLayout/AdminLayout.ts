import { Component } from "src/ui/Component";

import html from "./template.html" with { type: "text" }

export class AdminLayout extends Component {

    constructor(){
        super({
            css: "",
            template: html as unknown as string
        })
    }

}

customElements.define("mediahub-admin-layout", AdminLayout);