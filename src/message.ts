import type { UserId } from "./ws";

export type BiosphereMessage = {
    channel: string,
    event: string,
} & ({
    receiver: 'client',
} | {
    receiver: 'server',
    userId: UserId,
}) & Record<string, unknown>;

export function messageToJson(message: BiosphereMessage): string {
    return JSON.stringify(message);
}

export function jsonToMessage(json: string | Record<string, unknown>, userId: UserId | undefined = undefined): BiosphereMessage {
    const parsed = (typeof json === 'string' ? JSON.parse(json) : json) satisfies {
        event: string,
        channel: string,
    };

    const {
        receiver,
        event,
        channel,
        ...data
    } = parsed;

    return {
        channel,
        event,
        receiver,
        ...data,
        ...(userId === undefined ? {} : { userId }),
    };
}
