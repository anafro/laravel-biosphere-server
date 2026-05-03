import { env, RedisClient } from "bun";
import { sendToClient } from "./ws";
import { jsonToMessage, messageToJson, type BiosphereMessage } from "./message";
import { freeze } from "./utils/freeze";

export async function createRedisClient(): Promise<RedisClient> {
    const redis = new RedisClient(`redis://${env.REDIS_HOST}:${env.REDIS_PORT}`, {
        autoReconnect: true,
        maxRetries: 20,
        enableAutoPipelining: true,
        enableOfflineQueue: true,
        connectionTimeout: 3000,
    });

    await redis.connect();
    return redis;
}

export async function startRedisPubSubServer(): Promise<void> {
    console.info("(Biosphere Redis P/S): Starting...")
    const redis = await createRedisClient();
    await redis.subscribe(env.BIOSPHERE_REDIS_CHANNEL_FROM_SERVER, (json: string): void => {
        sendToClient(jsonToMessage(json));
    });

    await freeze();
    console.warn("(Biosphere Redis P/S) Finished!");
    redis.close();
}

export async function sendToServer(message: BiosphereMessage): Promise<void> {
    await (await createRedisClient()).publish(env.BIOSPHERE_REDIS_CHANNEL_TO_SERVER, messageToJson(message));
}
