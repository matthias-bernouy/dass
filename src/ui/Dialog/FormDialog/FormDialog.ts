import { Component } from "../../Component";
import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class FormDialog extends Component {

    private dialog: HTMLDialogElement;
    private form: HTMLFormElement;

    static get observedAttributes() {
        return ['action', 'method', 'enctype'];
    }

    constructor() {
        super({
            css,
            template: template as unknown as string
        });
        this.dialog = this.shadowRoot?.querySelector("dialog")!;
        this.form = this.shadowRoot?.querySelector("#form-validation")!;

        this.form.addEventListener("formdata", (e) => {
            const slottedInputs = this.querySelectorAll('[name]');
            slottedInputs.forEach((el: any) => {
                if (el.name && el.value) {
                    e.formData.append(el.getAttribute("name"), el.value);
                }
            });
        });
    }

    override connectedCallback() {
        this.dialog.addEventListener('click', (event) => {
            const rect = this.dialog.getBoundingClientRect();
            const isInDialog = (
                rect.top <= event.clientY &&
                event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX &&
                event.clientX <= rect.left + rect.width
            );
            if (!isInDialog) {
                this.close();
            }
        });
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (!this.form) return;
        if (name === 'action')  this.form.action = newVal as any;
        if (name === 'method')  this.form.method = newVal as any;
        if (name === 'enctype') this.form.enctype = newVal as any;
    }

    showModal() {
        this.dialog.showModal();
        this.style.display = "block";
    }

    close() {
        this.dialog.close();
    }
}

customElements.define("p9r-form-dialog", FormDialog);