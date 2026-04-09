import type { IBe5_Authentication, IBe5_Subject } from 'src/interfaces/AuthInterface';
import { loginSubmit } from './api/loginSubmit';
import { registerSubmit } from './api/registerSubmit';
import { join } from "node:path"
import { jwtVerify } from 'jose';
import type { IBe5_Runner } from 'src/interfaces/RunnerInterface';

import loginPage from "./pages/login.page.html" with { type: "text" }
import registerPage from "./pages/register.page.html" with { type: "text" }
import disabledPage from "./pages/disabled.page.html" with { type: "text" }
import { send_html } from './utilities/send_html';
import type { AuthRepository } from './interfaces/repository/AuthRepository';

interface Be5_TokenPayload {
    email: string;
    role: 'admin' | 'user';
    sub: string;
}

export type AuthConfig = {
    basePath?: string;
    registerDisabled?: boolean;
    defaultRedirection?: string;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export class Authentication implements IBe5_Authentication {

    public registerDisabled: boolean;
    public defaultRedirection: string;

    private _repository: AuthRepository;

    public readonly loginPage: string;
    public readonly registerPage: string;
    public readonly recoverPage: string;
    public readonly logoutPage: string;

    constructor(repository: AuthRepository, runner: IBe5_Runner, config?: AuthConfig) {

        this._repository = repository

        const htmlLoginPage = (loginPage as unknown as string).replace('defaultRedirect = "/"', `defaultRedirect = "${config?.defaultRedirection || "/"}";`)
        const htmlRegisterPage = (registerPage as unknown as string).replace('defaultRedirect = "/"', `defaultRedirect = "${config?.defaultRedirection || "/"}";`)

        this.registerDisabled = config?.registerDisabled || false;
        this.defaultRedirection = config?.defaultRedirection || "/"
        this.loginPage = join(config?.basePath || "/auth", "login")
        this.registerPage = join(config?.basePath || "/auth", "register")
        this.recoverPage = join(config?.basePath || "/auth", "recover")
        this.logoutPage = join(config?.basePath || "/auth", "logout")

        runner.group(config?.basePath || "/auth", (r) => {
            r.post("/loginSubmit",    (req) => loginSubmit(req, this));
            r.post("/registerSubmit", (req) => registerSubmit(req, this));

            r.get("/login", (req) => send_html(htmlLoginPage));
            r.get("/register", async (req) => {
                if (this.registerDisabled){
                    const count = await this.repository.count();
                    if ( count > 0 ) return send_html(disabledPage as unknown as string)
                }
                return send_html(htmlRegisterPage)
            });
        })
    }

    get repository() {
        return this._repository
    }

    async getSubject(req: Request): Promise<IBe5_Subject | null> {
        const cookieHeader = req.headers.get("cookie");
        if (!cookieHeader) return null;

        const token = cookieHeader
            .split(";")
            .map(c => c.trim())
            .find(c => c.startsWith("Be5Credentials="))
            ?.split("=")[1];

        if (!token) return null;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET, {
                algorithms: ["HS256"],
            });

            const data = payload as unknown as Be5_TokenPayload;

            return {
                identifier: data.email,
                role: data.role
            };
        } catch (error) {
            // Si le token est expiré ou invalide, jose lève une erreur
            console.error("JWT Verification failed:", error instanceof Error ? error.message : error);
            return null;
        }
    }

    async isAuthenticated(req: any): Promise<boolean> {
        const subject = await this.getSubject(req);
        return subject !== null;
    }

    async guardAuthenticated(req: any): Promise<IBe5_Subject> {
        const subject = await this.getSubject(req);
        if (!subject) throw new Error("AuthenticationError: Access Denied");
        return subject;
    }

    withRedirect(page: string, redirect: string): string {
        const url = new URL(page, "http://localhost");
        url.searchParams.set("redirect", redirect);
        return url.pathname + url.search;
    }
}