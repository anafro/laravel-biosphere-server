import { startRedisPubSubServer } from "./redis";
import { startWebsocketServer } from "./ws";

await (async function main(): Promise<void> {
    await Promise.all([
        startRedisPubSubServer(),
        startWebsocketServer(),
    ]);
})();
