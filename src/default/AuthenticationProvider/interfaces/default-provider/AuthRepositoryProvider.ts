import { Collection, Db, MongoClient } from "mongodb";
import type { AuthRepository, TSubject } from "../repository/AuthRepository";

type DefaultDatastoreConfig = {
    uri: string;
    databaseName: string;
}

/**
 * @description This is a default implementation of the AuthRepository interface.
 * @description It can be used for the production or for development.
 * @description This default implementation use mongodb as database.
 * 
 **/
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

    findByEmail(email: string): Promise<TSubject | null> {
        return new Promise((resolve, reject) => {
            this._accountCollection.findOne({ email }).then(account => {
                if (account) {
                    resolve(account);
                } else {
                    resolve(null);
                }
            }).catch(err => {
                console.error("Failed to get subject by email", err);
                reject(err);
            });
        });
    }

    register(subject: TSubject): Promise<TSubject> {
        return new Promise((resolve, reject) => {
            this._accountCollection.insertOne(subject).then(result => {
                if (result.acknowledged) {
                    resolve(subject);
                } else {
                    reject(new Error("Failed to create account"));
                }
            }).catch(err => {
                console.error("Failed to create account", err);
                reject(err);
            });
        });
    }

    count(): Promise<number> {
        return new Promise((resolve, reject) => {
            this._accountCollection.countDocuments()
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                console.error("Failed to create account", err);
                reject(err);
            })
        });
    }

}