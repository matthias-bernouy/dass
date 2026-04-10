import { Collection, Db, MongoClient } from "mongodb";
import type { AuthRepository, TAuthToken, TSubject } from "../repository/AuthRepository";

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
    private _tokenCollection: Collection<TAuthToken>;

    constructor(client: MongoClient, databaseName: string) {
        this._database = client.db(databaseName);
        this._accountCollection = this._database.collection<TSubject>("auth");
        this._tokenCollection = this._database.collection<TAuthToken>("auth_tokens");
    }

    static async create(config: DefaultDatastoreConfig): Promise<AuthRepositoryProvider> {
        const client = await new MongoClient(config.uri).connect();
        const instance = new AuthRepositoryProvider(client, config.databaseName);

        // Token indexes: unique lookup by hash, per-user listing, and a TTL
        // index so Mongo auto-reaps expired tokens in the background.
        await Promise.all([
            instance._tokenCollection.createIndex({ tokenHash: 1 }, { unique: true }),
            instance._tokenCollection.createIndex({ userEmail: 1 }),
            instance._tokenCollection.createIndex({ id: 1 }, { unique: true }),
            instance._tokenCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        ]);

        return instance;
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

    // ── API tokens ───────────────────────────────────────────────────────

    async createToken(token: TAuthToken): Promise<void> {
        const result = await this._tokenCollection.insertOne(token);
        if (!result.acknowledged) throw new Error("Failed to create token");
    }

    async findTokenByHash(tokenHash: string): Promise<TAuthToken | null> {
        return await this._tokenCollection.findOne({ tokenHash });
    }

    async listTokensForUser(userEmail: string): Promise<TAuthToken[]> {
        return await this._tokenCollection.find({ userEmail }).toArray();
    }

    async deleteTokenById(id: string): Promise<void> {
        await this._tokenCollection.deleteOne({ id });
    }

    async deleteTokensForUser(userEmail: string): Promise<void> {
        await this._tokenCollection.deleteMany({ userEmail });
    }
}
