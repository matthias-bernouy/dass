import { Component } from "../../Component";
import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

export class SegmentedSwitch extends Component {
    static formAssociated = true;
    private _internals: ElementInternals;
    private _slider: HTMLElement | null = null;
    private _optionsContainer: HTMLElement | null = null;
    private _optionCount: number = 0;

    static get observedAttributes() {
        return ['value', 'disabled', 'name', 'label'];
    }

    constructor() {
        super({
            css,
            template: template as unknown as string
        });
        this._internals = this.attachInternals();
    }

    override connectedCallback() {
        this._slider = this.shadowRoot?.querySelector('.selection-slider') || null;
        this._optionsContainer = this.shadowRoot?.querySelector('.options-container') || null;

        const slot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
        if (slot) {
            slot.addEventListener('slotchange', () => this._onSlotChange(slot));
            // `slotchange` does NOT fire when the element is upgraded with
            // pre-existing light-DOM children (or on reconnect) — sync now so
            // --total-options, click handlers, and slider position are set.
            this._onSlotChange(slot);
        }

        this._updateLabel();
    }

    private _updateLabel() {
        const el = this.shadowRoot?.querySelector('.label');
        if (el) el.textContent = this.getAttribute('label') || '';
    }

    get value() { return this.getAttribute('value') || ""; }
    set value(v) {
        // Compare against the raw attribute (not the getter) so that the
        // "already synced" check only short-circuits setAttribute — avoiding
        // the attributeChangedCallback → setter → setAttribute loop. The
        // side effects below must always run, otherwise an upgrade with a
        // pre-set `value` attribute would silently skip form registration
        // and slider positioning.
        if (this.getAttribute('value') !== v) this.setAttribute('value', v);
        this._internals.setFormValue(v);
        this._updateSliderPosition();
        this._updateSlottedSelections(v);

        this.dispatchEvent(new Event('change', { bubbles: true }));
    }

    get name() { return this.getAttribute('name') || ""; }

    private _onSlotChange(slot: HTMLSlotElement) {
        const options = slot.assignedElements();
        this._optionCount = options.length;
        this.style.setProperty('--total-options', this._optionCount.toString());

        options.forEach((opt) => {
            opt.setAttribute('role', 'radio');
            opt.setAttribute('tabindex', '0');

            (opt as HTMLElement).onclick = () => this.value = opt.getAttribute('value') || "";
        });

        this._updateSliderPosition();
        // If the value was set before the options were attached (e.g. via
        // an attribute on the tag before appendChild), the earlier call to
        // `_updateSlottedSelections` found nothing to mark. Re-run it now
        // that the options are assigned.
        this._updateSlottedSelections(this.value);
    }

    private _handleOptionClick(e: Event) {
        const target = e.target as HTMLElement;
        // Check if the clicked element is a slotted <option>
        if (target.tagName === 'OPTION' && target.assignedSlot) {
            const newValue = target.getAttribute('value');
            if (newValue) this.value = newValue;
        }
    }

    private _updateSliderPosition() {
        const options = (this.shadowRoot?.querySelector('slot') as HTMLSlotElement).assignedElements();
        const index = options.findIndex(opt => opt.getAttribute('value') === this.value);
        
        if (index !== -1) {
            this.style.setProperty('--active-index', index.toString());
            options.forEach((opt, i) => opt.setAttribute('aria-checked', (i === index).toString()));
        }
    }

    private _updateSlottedSelections(selectedValue: string) {
        const slot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
        const options = slot.assignedElements().filter(el => el.tagName === 'OPTION');
        
        options.forEach(opt => {
            if (opt.getAttribute('value') === selectedValue) {
                opt.setAttribute('selected', '');
            } else {
                opt.removeAttribute('selected');
            }
        });
    }

    attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
        if (name === 'value') this.value = newVal;
        else if (name === 'label') this._updateLabel();
    }
}

if (!customElements.get("p9r-segmented-switch")) {
    customElements.define("p9r-segmented-switch", SegmentedSwitch);
}