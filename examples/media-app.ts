/**
 * Demo : 1 MediaHub multi-tenant + 2 apps cliens partageant la même provider
 * mais chacune collée sur son bucket.
 *
 * Topologie :
 *   MediaHub    http://localhost:4000   (MtMediaProvider + admin UI via DevConsumer)
 *   CMS A       http://localhost:4001   (bucket "cms-a")
 *   CMS B       http://localhost:4002   (bucket "cms-b")
 *
 * Ce que ça illustre :
 *   - Un seul service MediaHub hoste N buckets isolés (metadata + bytes).
 *   - Chaque app connaît son `bucketID` + `bucketSecret` (secret partagé
 *     généré à la création du bucket).
 *   - Côté app, un endpoint local `/.mediahub/tokens` (MtMediaTokenBroker)
 *     mint des tokens one-time en appelant le provider avec le secret ;
 *     jamais le secret ne transite vers le navigateur.
 *   - Côté navigateur, chaque mutation passe par ce endpoint pour obtenir
 *     un token, puis tape directement la provider — les reads sont publics.
 *   - L'UI (admin + CMS) est construite à partir des composants `src/ui/*`
 *     bundlés en un seul module servi à `/static/demo.js`.
 *
 * Bootstrap :
 *   Les buckets sont créés au démarrage dans le `BucketRepository` partagé,
 *   leurs secrets injectés directement dans les apps. En prod, l'admin les
 *   crée via http://localhost:4000/mediahub/admin et copie le secret à la
 *   main dans la config de chaque app.
 *
 * Run :
 *   bun examples/media-app.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DefaultRunner } from "../src/Runner/DefaultRunner";
import { DevConsumer } from "../src/Authentication/consumers/DevConsumer";
import { InMemoryBucketRepository } from "../src/Media/MtMediaProvider/InMemoryBucketRepository";
import { InMemoryBucketMediaStorage } from "../src/Media/MtMediaProvider/InMemoryBucketMediaStorage";
import { MtMediaProvider } from "../src/Media/MtMediaProvider/MtMediaProvider";
import { MtMediaTokenBroker } from "../src/Media/MtMediaProvider/MtMediaTokenBroker";
import { randomBase64Url, sha256Hex } from "../src/utilities/crypto";

const HUB_PORT = 4000;
const CMS_A_PORT = 4001;
const CMS_B_PORT = 4002;

const HUB_BASE_URL = `http://localhost:${HUB_PORT}`;
const HUB_MEDIA_URL = `${HUB_BASE_URL}/mediahub`;

// Each app advertises its own absolute URL for script/CSS asset paths so the
// demo pages load the bundle from their own origin (same-origin = no extra
// CORS required).
const HUB_ASSETS = { script: `${HUB_BASE_URL}/static/demo.js`, style: `${HUB_BASE_URL}/static/theme.css` };

const buckets = new InMemoryBucketRepository();
const storage = new InMemoryBucketMediaStorage();

// ── client bundle built once at startup ─────────────────────────────────
// Bundled into a string (in-memory), served at `/static/demo.js` on every
// server. Theme is just read from disk — no transform needed.

async function buildClientBundle(): Promise<string> {
    const out = await Bun.build({
        entrypoints: [join(import.meta.dir, "media-app.client.ts")],
        target: "browser",
        format: "esm",
        minify: false,
    });
    if (!out.success) {
        console.error("Client bundle failed:", out.logs);
        throw new Error("bundle failed");
    }
    return out.outputs[0]!.text();
}

const THEME_CSS = readFileSync(join(import.meta.dir, "media-app.theme.css"), "utf8");
let CLIENT_JS = "";

async function seedBucket(name: string): Promise<{ id: string; secret: string }> {
    const secret = randomBase64Url(32);
    const bucket = await buckets.create({
        name,
        secretHash:        await sha256Hex(secret),
        maxFileSize:       50 * 1024 * 1024,
        acceptedMimeTypes: "*",
    });
    return { id: bucket.id, secret };
}

// ── servers ──────────────────────────────────────────────────────────────

function mountStaticAssets(runner: DefaultRunner) {
    runner.get("/static/demo.js", () => new Response(CLIENT_JS, {
        headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=60" },
    }));
    runner.get("/static/theme.css", () => new Response(THEME_CSS, {
        headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=60" },
    }));
}

function startHub() {
    const runner = new DefaultRunner();

    // DevConsumer = always authenticated as "admin" for the local demo.
    // In prod, swap for KeycloakConsumer / TokenConsumer / Composite.
    const auth = new DevConsumer(runner, {
        subject: { identifier: "local-dev", role: "admin", displayName: "Local Admin" },
    });

    mountStaticAssets(runner);

    runner.group("/mediahub", (r) => {
        new MtMediaProvider(r, {
            admin:        auth,
            buckets,
            storage,
            uiScriptUrl:  HUB_ASSETS.script,
            uiStyleUrl:   HUB_ASSETS.style,
        });
    });

    runner.get("/", () => htmlPage({
        title: "MediaHub",
        assets: HUB_ASSETS,
        body: `
            <w13c-left-menu-layout>
                <w13c-lateral-menu slot="sidebar">
                    <h1 slot="header">MediaHub</h1>
                    <w13c-lateral-menu-item href="/">Dashboard</w13c-lateral-menu-item>
                    <w13c-lateral-menu-item href="/mediahub/admin">Buckets</w13c-lateral-menu-item>
                </w13c-lateral-menu>
                <div class="page">
                    <header class="page-header"><h1>Dashboard</h1></header>
                    <div class="card">
                        <p>Service multi-tenant, 1 provider / N buckets.</p>
                        <p class="muted">→ <a href="/mediahub/admin">Admin des buckets</a></p>
                    </div>
                    <div class="card">
                        <h2>Apps branchées</h2>
                        <ul>
                            <li><a href="http://localhost:${CMS_A_PORT}">CMS A</a> (port ${CMS_A_PORT})</li>
                            <li><a href="http://localhost:${CMS_B_PORT}">CMS B</a> (port ${CMS_B_PORT})</li>
                        </ul>
                    </div>
                </div>
            </w13c-left-menu-layout>`,
    }));

    runner.start(HUB_PORT);
    console.log(`🗄️  MediaHub   : ${HUB_BASE_URL}`);
}

function startCms(label: string, port: number, bucketID: string, bucketSecret: string) {
    const runner = new DefaultRunner();
    const baseUrl = `http://localhost:${port}`;
    const assets  = { script: `${baseUrl}/static/demo.js`, style: `${baseUrl}/static/theme.css` };

    mountStaticAssets(runner);

    // Local token broker — the only place that holds the bucketSecret.
    runner.group("/.mediahub", (r) => {
        new MtMediaTokenBroker(r, {
            providerUrl: HUB_MEDIA_URL,
            bucketID,
            bucketSecret,
        });
    });

    runner.get("/", () => htmlPage({
        title: `${label} — media`,
        assets,
        body: renderCmsBody({ label, bucketID, hubUrl: HUB_MEDIA_URL }),
    }));

    runner.start(port);
    console.log(`🛰️  ${label.padEnd(6)} : ${baseUrl}   bucket=${bucketID}`);
}

// ── page bodies ─────────────────────────────────────────────────────────

function renderCmsBody(ctx: { label: string; bucketID: string; hubUrl: string }): string {
    const { label, bucketID, hubUrl } = ctx;
    return `
        <w13c-left-menu-layout>
            <w13c-lateral-menu slot="sidebar">
                <h1 slot="header">${escapeHtml(label)}</h1>
                <w13c-lateral-menu-item href="/">Media</w13c-lateral-menu-item>
            </w13c-lateral-menu>

            <div class="page">
                <header class="page-header">
                    <div>
                        <h1>Media library</h1>
                        <p class="muted" id="bucket-info">Bucket : <code>${escapeHtml(bucketID)}</code></p>
                    </div>
                    <p9r-button variant="filled" color="primary" id="upload-btn">Uploader un fichier</p9r-button>
                </header>

                <p9r-table>
                    <p9r-row slot="header">
                        <p9r-header-cell>Aperçu</p9r-header-cell>
                        <p9r-header-cell>Nom</p9r-header-cell>
                        <p9r-header-cell>Type</p9r-header-cell>
                        <p9r-header-cell>Taille</p9r-header-cell>
                        <p9r-header-cell>Actions</p9r-header-cell>
                    </p9r-row>
                    <tbody id="items-body"></tbody>
                </p9r-table>
                <p id="items-empty" class="muted" hidden>Aucun fichier. Upload ton premier média pour peupler la liste.</p>
            </div>
        </w13c-left-menu-layout>

        <p9r-form-dialog id="upload-dialog">
            <span slot="title">Uploader un fichier</span>
            <w13c-input-file name="file"></w13c-input-file>
        </p9r-form-dialog>

        <p9r-form-dialog id="delete-dialog">
            <span slot="title">Supprimer le fichier</span>
            <p>Cette action est <strong>irréversible</strong>. Le fichier sera retiré du bucket.</p>
        </p9r-form-dialog>

        <script type="module">
            const HUB_URL   = ${JSON.stringify(hubUrl)};
            const BUCKET_ID = ${JSON.stringify(bucketID)};
            const { showToast, MtMediaConsumer } = window.MtMediaDemo;

            const media = await MtMediaConsumer.fromProvider({
                providerUrl: HUB_URL,
                bucketID:    BUCKET_ID,
                tokenUrl:    "/.mediahub/tokens",
            });

            const itemsBody  = document.getElementById("items-body");
            const itemsEmpty = document.getElementById("items-empty");
            const bucketInfo = document.getElementById("bucket-info");
            const uploadDialog = document.getElementById("upload-dialog");
            const deleteDialog = document.getElementById("delete-dialog");
            let pendingDelete = null;

            bucketInfo.innerHTML =
                "Bucket <code>" + BUCKET_ID + "</code> · max " +
                formatBytes(media.limits.maxFileSize) +
                " · MIMEs : " +
                (media.limits.acceptedMimeTypes === "*"
                    ? "tous"
                    : media.limits.acceptedMimeTypes.join(", "));

            function formatBytes(n) {
                if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MiB";
                if (n >= 1024)        return (n / 1024).toFixed(1) + " KiB";
                return n + " o";
            }

            function typeTag(t) {
                const map = { image: "info", video: "primary", audio: "warning", pdf: "danger", document: "secondary", text: "secondary", archive: "warning" };
                const color = map[t] ?? "secondary";
                return '<p9r-tag color="' + color + '">' + t + '</p9r-tag>';
            }

            async function refresh() {
                const res = await media.getItems();
                itemsBody.innerHTML = "";
                if (!res.ok) {
                    showToast("Erreur de chargement : " + res.error.message, { type: "error" });
                    return;
                }
                if (res.data.items.length === 0) {
                    itemsEmpty.hidden = false;
                    return;
                }
                itemsEmpty.hidden = true;
                for (const item of res.data.items) {
                    const row = document.createElement("p9r-row");
                    const preview = item.type === "image"
                        ? '<img src="' + item.absoluteURL + '&w=80&h=80&fit=cover" style="width:60px;height:60px;border-radius:6px;object-fit:cover;display:block;" />'
                        : '<span class="muted">—</span>';
                    row.innerHTML =
                        '<p9r-cell>' + preview + '</p9r-cell>' +
                        '<p9r-cell><strong>' + escapeHtml(item.name) + '</strong></p9r-cell>' +
                        '<p9r-cell>' + typeTag(item.type) + '</p9r-cell>' +
                        '<p9r-cell>' + (item.type === "folder" ? "—" : formatBytes(item.size)) + '</p9r-cell>' +
                        '<p9r-cell>' +
                            '<div class="row">' +
                                '<p9r-button variant="ghost" data-open="' + item.absoluteURL + '">Ouvrir</p9r-button>' +
                                '<p9r-button variant="ghost" color="danger" data-delete="' + item.id + '" data-name="' + escapeHtml(item.name) + '">Supprimer</p9r-button>' +
                            '</div>' +
                        '</p9r-cell>';
                    itemsBody.appendChild(row);
                }
            }

            function escapeHtml(s) {
                return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
            }

            // Open upload dialog
            document.getElementById("upload-btn").addEventListener("click", () => uploadDialog.showModal());

            // Upload: intercept the dialog's internal form submit so we can
            // go through MtMediaConsumer (fetches a token, then POSTs to the
            // hub) instead of letting the browser navigate.
            const uploadForm = uploadDialog.shadowRoot.querySelector("#form-validation");
            uploadForm.addEventListener("submit", async (ev) => {
                ev.preventDefault();
                const fileEl = uploadDialog.querySelector('[name="file"]');
                const file = fileEl?.value;
                if (!file) {
                    showToast("Aucun fichier sélectionné.", { type: "warning" });
                    return;
                }
                const res = await media.uploadFile({ data: file, name: file.name, mimeType: file.type });
                if (res.ok) {
                    showToast("Upload : " + res.data.name, { type: "success" });
                    uploadDialog.close();
                    await refresh();
                } else {
                    showToast("Erreur upload : " + res.error.message, { type: "error" });
                }
            });

            // Delete: open confirm dialog, remember id, wait for confirm.
            document.addEventListener("click", (ev) => {
                const del = ev.target.closest?.("[data-delete]");
                if (del) {
                    pendingDelete = { id: del.dataset.delete, name: del.dataset.name };
                    deleteDialog.querySelector(".pending-name")?.remove();
                    const tip = document.createElement("p");
                    tip.className = "pending-name muted";
                    tip.textContent = "Fichier : " + pendingDelete.name;
                    deleteDialog.appendChild(tip);
                    deleteDialog.showModal();
                    return;
                }
                const open = ev.target.closest?.("[data-open]");
                if (open) window.open(open.dataset.open, "_blank", "noopener");
            });

            const deleteForm = deleteDialog.shadowRoot.querySelector("#form-validation");
            deleteForm.addEventListener("submit", async (ev) => {
                ev.preventDefault();
                if (!pendingDelete) return;
                const res = await media.deleteItem({ id: pendingDelete.id });
                if (res.ok) {
                    showToast("Supprimé : " + pendingDelete.name, { type: "success" });
                    deleteDialog.close();
                    pendingDelete = null;
                    await refresh();
                } else {
                    showToast("Erreur suppression : " + res.error.message, { type: "error" });
                }
            });

            refresh();
        </script>
    `;
}

// ── minimal layout ────────────────────────────────────────────────────────

function htmlPage(opts: { title: string; assets: { script: string; style: string }; body: string }): Response {
    return new Response(`<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.title)}</title>
    <link rel="stylesheet" href="${escapeHtml(opts.assets.style)}" />
    <script type="module" src="${escapeHtml(opts.assets.script)}"></script>
</head>
<body>
${opts.body}
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── boot ──────────────────────────────────────────────────────────────────

async function main() {
    CLIENT_JS = await buildClientBundle();

    const a = await seedBucket("cms-a");
    const b = await seedBucket("cms-b");

    startHub();
    startCms("CMS A", CMS_A_PORT, a.id, a.secret);
    startCms("CMS B", CMS_B_PORT, b.id, b.secret);

    console.log();
    console.log(`→ Ouvre http://localhost:${CMS_A_PORT} pour uploader un fichier.`);
    console.log(`→ Ouvre http://localhost:${CMS_B_PORT} : isolé du bucket A.`);
    console.log(`→ Ouvre ${HUB_BASE_URL}/mediahub/admin pour gérer les buckets.`);
    console.log();
    console.log(`   bucket cms-a = ${a.id}`);
    console.log(`   bucket cms-b = ${b.id}`);
}

main();
