import { Collection, Db, MongoClient } from "mongodb";
import type { AuthRepository, TSubject } from "../repository/AuthRepository";

type DefaultDatastoreConfig = {
    uri: string;
    databaseName: string;
}

/**
 * Default MongoDB-backed implementation of AuthRepository.
 */
export class AuthRepositoryProvider implements AuthRepository {

    private _database: Db;
    private _accountCollection: Collection<TSubject>;

    constructor(client: MongoClient, databaseName: string) {
        this._database = client.db(databaseName);
        this._accountCollection = this._database.collection<TSubject>("auth");
    }

    static create(config: DefaultDatastoreConfig): Promise<AuthRepositoryProvider> {
        return new Promise((resolve, reject) => {
            new MongoClient(config.uri).connect().then(client => {
                const instance = new AuthRepositoryProvider(client, config.databaseName);
                resolve(instance);
            }).catch(err => {
                console.error("Failed to connect to the database", err);
                reject(err);
            });
        });
    }

    async findByEmail(email: string): Promise<TSubject | null> {
        return await this._accountCollection.findOne({ email });
    }

    async findByResetTokenHash(tokenHash: string): Promise<TSubject | null> {
        return await this._accountCollection.findOne({ passwordResetTokenHash: tokenHash });
    }

    async register(subject: TSubject): Promise<TSubject> {
        const toInsert: TSubject = {
            ...subject,
            createdAt: subject.createdAt ?? new Date(),
        };
        const result = await this._accountCollection.insertOne(toInsert);
        if (!result.acknowledged) throw new Error("Failed to create account");
        return toInsert;
    }

    async updatePassword(email: string, passwordHash: string): Promise<void> {
        const result = await this._accountCollection.updateOne(
            { email },
            { $set: { passwordHash } }
        );
        if (result.matchedCount === 0) throw new Error(`No account found for ${email}`);
    }

    async updateRole(email: string, role: 'admin' | 'user'): Promise<void> {
        const result = await this._accountCollection.updateOne(
            { email },
            { $set: { role } }
        );
        if (result.matchedCount === 0) throw new Error(`No account found for ${email}`);
    }

    async setResetToken(email: string, tokenHash: string, expiresAt: Date): Promise<void> {
        const result = await this._accountCollection.updateOne(
            { email },
            { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } }
        );
        if (result.matchedCount === 0) throw new Error(`No account found for ${email}`);
    }

    async clearResetToken(email: string): Promise<void> {
        await this._accountCollection.updateOne(
            { email },
            { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } }
        );
    }

    async delete(email: string): Promise<void> {
        await this._accountCollection.deleteOne({ email });
    }

    async list(): Promise<TSubject[]> {
        return await this._accountCollection.find({}).toArray();
    }

    async count(): Promise<number> {
        return await this._accountCollection.countDocuments();
    }
}
