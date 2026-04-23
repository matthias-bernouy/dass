/**
 * Browser entry for the `media-app` demo. Side-effect-imports every custom
 * element shipped under `src/ui/*` so the HTML served by the hub and the
 * CMS apps can lean on the whole toolkit without each page hand-picking
 * its registrations.
 *
 * Bundled by the server at startup via `Bun.build({ target: "browser" })`
 * and served at `/static/demo.js`. Pages load it once with
 * `<script type="module" src="/static/demo.js"></script>`.
 *
 * `window.MtMediaDemo` is populated so inline page scripts can reuse the
 * shared `showToast` helper and the in-flight client-side MtMediaConsumer
 * without another round-trip through the module loader.
 */
import "../src/ui/Form/Button/Button";
import "../src/ui/Form/Checkbox/Checkbox";
import "../src/ui/Form/FormSection";
import "../src/ui/Form/InputFile/InputFile";
import "../src/ui/Form/P9rInput";
import "../src/ui/Form/P9rRange";
import "../src/ui/Form/P9rSelect";
import "../src/ui/Form/P9rSizesSelect";
import "../src/ui/Form/SegmentedSwitch/SegmentedSwitch";
import "../src/ui/Form/TagSuggest/TagSuggest";
import "../src/ui/Dialog/FormDialog/FormDialog";
import "../src/ui/Dialog/LateralDialog/LateralDialog";
import "../src/ui/HorizontalActionGroup/HorizontalActionGroup";
import "../src/ui/Layout/LeftMenuLayout/LeftMenuLayout";
import "../src/ui/Menu/LateralMenu/LateralMenu";
import "../src/ui/Menu/LateralMenu/LateralMenuItem/LateralMenuItem";
import "../src/ui/Table/Table";
import "../src/ui/Tag/Tag";
import "../src/ui/Toast/Toast";
import "../src/ui/Toast/ToastStack";

import { showToast } from "../src/ui/Toast/ToastStack";
import { MtMediaConsumer } from "../src/Media/MtMediaProvider/MtMediaConsumer";

// Make the pieces inline-page scripts need available on `window`. This is
// a demo convenience — a real app would `import` from its own bundle.
(globalThis as unknown as { MtMediaDemo: {
    showToast: typeof showToast;
    MtMediaConsumer: typeof MtMediaConsumer;
}}).MtMediaDemo = {
    showToast,
    MtMediaConsumer,
};
