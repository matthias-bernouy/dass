
export type TSubject = {
    id?: string;
    email: string;
    passwordHash: string;
    role: string;
}

export interface AuthRepository {

    findByEmail(email: string): Promise<TSubject | null>;
    register(subject: TSubject): Promise<TSubject>;
    count(): Promise<number>;

}