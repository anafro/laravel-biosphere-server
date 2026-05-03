import type { ServerWebSocket } from "bun";
import { authenticate, authorize } from "./auth";
import { sendToServer } from "./redis";
import { later } from "./utils/later";
import { jsonToMessage, messageToJson, type BiosphereMessage } from "./message";
import { freeze } from "./utils/freeze";
import { heartbeat } from "./heartbeat";

export type UserId = number;
export type ConnectionData = {
    userId: UserId;
    channel: string;
};

export type BiosphereClient = ServerWebSocket<ConnectionData>;
export let websocketServer: Bun.Server<ConnectionData> = later();

export async function startWebsocketServer(): Promise<void> {
    console.info("(Biosphere WS) Starting...")
    websocketServer = Bun.serve<ConnectionData>({
        port: 3000,

        async fetch(req: Request, server: ReturnType<typeof Bun.serve<ConnectionData>>): Promise<Response | undefined> {
            const params = new URL(req.url).searchParams;
            const token = params.get("token") ?? '';
            const channel = params.get("channel") ?? '';
            const requestId = Math.random().toString(36);
            const ip = this.requestIP(req)?.address ?? 'unknown';

            if (channel === '') {
                console.info(`(Biosphere ${requestId}) No channel provided ${ip}`);
                return new Response(`Provide channel name in a \`?channel=\` parameter.`, { status: 400 });
            }

            if (token === '') {
                console.info(`(Biosphere ${requestId}) No token provided ${ip}`);
                return new Response(`Provide token in a \`?token=\` parameter.`, { status: 400 });
            }

            const authentication = await authenticate(token);

            if (!authentication.successful) {
                console.info(`(Biosphere ${requestId}) Unauthenticated user ${ip}@${channel}: ${authentication.message}`);
                return new Response(authentication.message, { status: 401 });
            }

            const id = authentication.userId;
            const authorization = await authorize(id, channel);

            if (!authorization.successful) {
                console.info(`(Biosphere ${requestId}) Unauthorized user ${id}@${channel}: ${authorization.message}`);
                return new Response(authorization.message, { status: 401 });
            }

            const upgraded = server.upgrade(req, {
                data: { userId: id, channel },
            });

            if (!upgraded) {
                return new Response("(Biosphere) Upgrade failed", { status: 400 });
            }

            return undefined;
        },

        websocket: {
            open(ws: BiosphereClient): void {
                console.log(`(Biosphere) Connected: ${ws.data.userId}`);
                ws.subscribe(ws.data.channel);
                sendToServer({
                    ...ws.data,
                    event: 'connect',
                    receiver: 'server',
                });
                heartbeat.startHeart(ws.data.userId, ws.data.channel);
            },

            message(ws: BiosphereClient, message: string | Buffer): void {
                if (typeof message !== 'string') {
                    ws.send('Server cannot accept bytes over websockets.');
                    return;
                }

                try {
                    sendToServer(jsonToMessage({
                        ...JSON.parse(message),
                        receiver: 'server',
                    }, ws.data.userId));
                } catch (error: unknown) {
                    if (error instanceof SyntaxError) {
                        ws.send("Error: Sent data is not JSON.");
                    }
                }
            },

            close(ws: BiosphereClient, code: number, reason: string): void {
                console.log(`(Biosphere) Disconnected ${ws.data.userId}@${ws.data.channel} w/code ${code}: ${reason}`);
                sendToServer({
                    ...ws.data,
                    event: 'disconnect',
                    receiver: 'server',
                    data: {},
                });
                heartbeat.stopHeart(ws.data.userId, ws.data.channel);
            },

            drain(ws: BiosphereClient): void {
                console.log(`(Biosphere) ${ws.data.userId}@${ws.data.channel} backpressure cleared`);
            },
        },
    });

    await freeze();
    console.warn("(Biosphere ws) Finished!");
}

export function sendToClient(message: BiosphereMessage): void {
    websocketServer.publish(message.channel, messageToJson(message));
}
