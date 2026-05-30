import { MongoClient } from "mongodb";

const pickEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && value !== "") {
            return value;
        }
    }
    return undefined;
};

const buildMongoUri = () => {
    const directUri = pickEnv("MONGO_URI", "MONGODB_URI");
    if (directUri) {
        return directUri;
    }

    const host = pickEnv("MONGO_HOST", "MONGODB_HOST", "localhost") ?? "localhost";
    const port = pickEnv("MONGO_PORT", "MONGODB_PORT", "27017") ?? "27017";
    const user = pickEnv("MONGO_USER", "MONGODB_USER");
    const password = pickEnv("MONGO_PASSWORD", "MONGODB_PASSWORD");
    const authDb = pickEnv("MONGO_AUTH_DB", "MONGODB_AUTH_DB", "admin") ?? "admin";
    const dbName = pickEnv("MONGO_DB", "MONGO_INITDB_DATABASE", "healthai_nutrition_recommendation")
        ?? "healthai_nutrition_recommendation";

    if (user && password) {
        const encodedUser = encodeURIComponent(user);
        const encodedPassword = encodeURIComponent(password);
        return `mongodb://${encodedUser}:${encodedPassword}@${host}:${port}/${dbName}?authSource=${authDb}`;
    }

    return `mongodb://${host}:${port}/${dbName}`;
};

const dbName = pickEnv("MONGO_DB", "MONGO_INITDB_DATABASE", "healthai_nutrition_recommendation")
    ?? "healthai_nutrition_recommendation";

let mongoClientPromise;

const getMongoClient = async () => {
    if (!mongoClientPromise) {
        const uri = buildMongoUri();
        const client = new MongoClient(uri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000
        });
        mongoClientPromise = client.connect();
    }

    return mongoClientPromise;
};

export const getMongoDb = async () => {
    const client = await getMongoClient();
    return client.db(dbName);
};
