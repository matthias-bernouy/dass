import { Component } from "../../Component";
import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class InputFile extends Component {
    static formAssociated = true;
    private _internals: ElementInternals;
    private _input: HTMLInputElement | null = null;
    private _preview: HTMLElement | null = null;

    constructor() {
        super({ css, template: template as unknown as string });
        this._internals = this.attachInternals();
    }

    override connectedCallback() {
        this._input = this.shadowRoot?.querySelector('input') || null;
        this._preview = this.shadowRoot?.querySelector('.file-info') || null;

        this.shadowRoot?.addEventListener('dragover', (e) => this._handleDrag(e, true));
        this.shadowRoot?.addEventListener('dragleave', (e) => this._handleDrag(e, false));
        this.shadowRoot?.addEventListener('drop', (e) => this._handleDrop(e as DragEvent));

        this._input?.addEventListener('change', () => this._updateValue());
    }

    private _handleDrag(e: Event, isOver: boolean) {
        e.preventDefault();
        this.toggleAttribute('dragging', isOver);
    }

    private _handleDrop(e: DragEvent) {
        e.preventDefault();
        this.removeAttribute('dragging');
        if (e.dataTransfer?.files && this._input) {
            this._input.files = e.dataTransfer.files;
            this._updateValue();
        }
    }

    private _updateValue() {
        const file = this._input?.files?.[0];
        if (file && this._preview) {
            this._preview.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            this._internals.setFormValue(file);
        }
    }

    get name() { return this.getAttribute('name') || ""; }
    get value() {
         return this._input?.files?.[0] || null;
     }
}

customElements.define("w13c-input-file", InputFile);