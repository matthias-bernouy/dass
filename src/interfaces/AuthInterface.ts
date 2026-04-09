export interface IBe5_Subject {
    identifier: string;
    role: 'admin' | 'user';
}

export interface IBe5_Authentication {

    readonly loginPage: string;
    readonly registerPage: string;
    readonly recoverPage: string;
    readonly logoutPage: string;

    withRedirect(page: string, path: string): string;
    getSubject(req: Request): Promise<IBe5_Subject | null>;
    isAuthenticated(req: Request): Promise<boolean>;
    guardAuthenticated(req: Request): Promise<IBe5_Subject>;

}