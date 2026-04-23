import { Component } from "../../Component";
import template from './template.html' with { type: 'text' };
import css from './style.css' with { type: 'text' };

import "../../Tag/Tag";

type Suggestion = { value: string; count: number };

/**
 * Form-associated autocomplete input.
 *
 * Attributes:
 * - `name`          : form field name (emitted via ElementInternals.setFormValue)
 * - `mode`          : "single" (default) or "multiple". Multiple stores a
 *                     comma-separated list of tags.
 * - `resource`      : "pages" | "snippets" | "templates" — used to fetch the
 *                     existing values from `GET {api}?resource=...`
 * - `api`           : API base path for the tags endpoint. Defaults to
 *                     `../api/tags`. Override to `../../api/tags` when the
 *                     component is embedded two levels deep.
 * - `placeholder`   : input placeholder
 *
 * Value format emitted to the form:
 * - single  : a single string, e.g. "hero"
 * - multiple: comma-joined, e.g. "hero,layout,cta"
 */
export class TagSuggest extends Component {
    static formAssociated = true;

    private _internals: ElementInternals;
    private _tags: string[] = [];
    private _suggestions: Suggestion[] = [];
    private _activeIndex: number = -1;
    private _input: HTMLInputElement | null = null;
    private _display: HTMLElement | null = null;
    private _suggestionsEl: HTMLElement | null = null;
    private _loaded: boolean = false;
    private _allSuggestions: Suggestion[] = [];

    constructor() {
        super({
            css: css as unknown as string,
            template: template as unknown as string,
        });
        this._internals = this.attachInternals();
    }

    override connectedCallback() {
        this._input = this.shadowRoot?.querySelector('#main-input') as HTMLInputElement | null;
        this._display = this.shadowRoot?.querySelector('#tags-display') || null;
        this._suggestionsEl = this.shadowRoot?.querySelector('#suggestions') || null;

        if (this._input) {
            const placeholder = this.getAttribute('placeholder');
            if (placeholder) this._input.placeholder = placeholder;

            this._input.addEventListener('input', () => this._onInput());
            this._input.addEventListener('keydown', (e: KeyboardEvent) => this._onKeyDown(e));
            this._input.addEventListener('focus', () => this._onFocus());
            this._input.addEventListener('blur', () => {
                // Delay so click on suggestion still fires.
                setTimeout(() => this._hideSuggestions(), 150);
            });
        }

        this._loadSuggestions();
    }

    // --- Data loading -----------------------------------------------------

    private async _loadSuggestions() {
        const resource = this.getAttribute('resource');
        if (!resource) return;

        const apiBase = this.getAttribute('api') || '../api/tags';
        const url = new URL(apiBase, window.location.href);
        url.searchParams.set('resource', resource);

        try {
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json() as Suggestion[];
            this._allSuggestions = data;
            this._loaded = true;
        } catch {
            /* offline / ignore */
        }
    }

    // --- Input events -----------------------------------------------------

    private _onFocus() {
        if (!this._loaded || !this._input) return;
        const query = this._input.value.trim().toLowerCase();
        this._refreshSuggestions(query);
    }

    private _onInput() {
        if (!this._input) return;
        const query = this._input.value.trim().toLowerCase();
        this._refreshSuggestions(query);
    }

    private _onKeyDown(e: KeyboardEvent) {
        if (!this._input) return;
        const mode = this.getAttribute('mode') || 'single';

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this._suggestions.length === 0) return;
            this._activeIndex = Math.min(this._activeIndex + 1, this._suggestions.length - 1);
            this._renderSuggestions();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this._suggestions.length === 0) return;
            this._activeIndex = Math.max(this._activeIndex - 1, -1);
            this._renderSuggestions();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const picked = this._activeIndex >= 0 ? this._suggestions[this._activeIndex] : undefined;
            if (picked) {
                this._select(picked.value);
            } else {
                const val = this._input.value.trim();
                if (val) this._select(val);
            }
        } else if (e.key === 'Escape') {
            this._hideSuggestions();
        } else if (e.key === 'Backspace' && this._input.value === '' && mode === 'multiple') {
            this._removeLastTag();
        } else if (e.key === ',' && mode === 'multiple') {
            e.preventDefault();
            const val = this._input.value.trim();
            if (val) this._select(val);
        }
    }

    // --- Selection --------------------------------------------------------

    private _select(value: string) {
        const mode = this.getAttribute('mode') || 'single';
        const trimmed = value.trim();
        if (!trimmed || !this._input) return;

        if (mode === 'multiple') {
            if (!this._tags.includes(trimmed)) {
                this._tags.push(trimmed);
            }
            this._input.value = '';
        } else {
            this._tags = [trimmed];
            this._input.value = trimmed;
        }
        this._activeIndex = -1;
        this._update();
        this._hideSuggestions();
    }

    private _removeLastTag() {
        if (this._tags.length === 0) return;
        this._tags.pop();
        this._update();
    }

    // --- Rendering --------------------------------------------------------

    private _update() {
        this._renderTags();
        this._internals.setFormValue(this.value);
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: this.value, tags: [...this._tags] },
        }));
    }

    private _renderTags() {
        if (!this._display) return;
        const mode = this.getAttribute('mode') || 'single';
        if (mode !== 'multiple') {
            this._display.innerHTML = '';
            return;
        }

        this._display.innerHTML = '';
        this._tags.forEach((tag, index) => {
            const el = document.createElement('p9r-tag');
            el.setAttribute('color', 'primary');
            el.textContent = tag;
            el.addEventListener('click', () => {
                this._tags.splice(index, 1);
                this._update();
            });
            this._display!.appendChild(el);
        });
    }

    private _refreshSuggestions(query: string) {
        const mode = this.getAttribute('mode') || 'single';
        const current = mode === 'multiple' ? this._tags : [];

        const pool = this._allSuggestions.filter(s => !current.includes(s.value));

        if (query === '') {
            this._suggestions = pool.slice(0, 8);
        } else {
            this._suggestions = pool
                .filter(s => s.value.toLowerCase().includes(query))
                .slice(0, 8);
        }
        this._activeIndex = -1;
        this._renderSuggestions();
    }

    private _renderSuggestions() {
        if (!this._suggestionsEl) return;
        if (this._suggestions.length === 0) {
            this._hideSuggestions();
            return;
        }

        this._suggestionsEl.innerHTML = '';
        this._suggestions.forEach((s, i) => {
            const row = document.createElement('div');
            row.className = 'suggestion';
            row.dataset.active = String(i === this._activeIndex);

            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = s.value;
            row.appendChild(name);

            const badge = document.createElement('p9r-tag');
            badge.setAttribute('color', 'secondary');
            badge.textContent = String(s.count);
            row.appendChild(badge);

            row.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                this._select(s.value);
            });

            this._suggestionsEl!.appendChild(row);
        });
        this._suggestionsEl.hidden = false;
    }

    private _hideSuggestions() {
        if (this._suggestionsEl) this._suggestionsEl.hidden = true;
        this._activeIndex = -1;
    }

    // --- Form API ---------------------------------------------------------

    get value(): string {
        const mode = this.getAttribute('mode') || 'single';
        if (mode === 'multiple') return this._tags.join(',');
        return this._tags[0] || '';
    }

    set value(v: string) {
        const mode = this.getAttribute('mode') || 'single';
        if (mode === 'multiple') {
            this._tags = v ? v.split(',').map(t => t.trim()).filter(t => t !== '') : [];
            if (this._input) this._input.value = '';
        } else {
            this._tags = v ? [v.trim()] : [];
            if (this._input) this._input.value = this._tags[0] || '';
        }
        this._update();
    }

    get name(): string {
        return this.getAttribute('name') || '';
    }
}

if (!customElements.get('p9r-tag-suggest')) {
    customElements.define('p9r-tag-suggest', TagSuggest);
}
