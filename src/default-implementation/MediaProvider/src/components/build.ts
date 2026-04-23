import "src/ui/export";

import "./AdminLayout/AdminLayout"

import { showToast } from "src/ui/Toast/ToastStack";

(globalThis as unknown as { MtMediaAdmin: { showToast: typeof showToast } }).MtMediaAdmin = {
    showToast,
};