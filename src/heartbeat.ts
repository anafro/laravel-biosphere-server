import { sendToClient, type UserId } from "./ws";

export const heartbeat = {
    hearts: new Map<string, NodeJS.Timeout>(),

    encodeHeartName(userId: UserId, channel: string): string {
        return `${userId}@${channel}`;
    },

    decodeHeartName(name: string): { userId: UserId, channel: string } {
        const [userId, channel] = name.split('@');
        if (userId === undefined || channel === undefined) {
            throw new Error(`${name} is not a valid heart name.`);
        }

        return {
            userId: parseInt(userId),
            channel,
        };
    },

    startHeart(userId: UserId, channel: string): void {
        const heartName = this.encodeHeartName(userId, channel);
        const heartHandler = setInterval(() => this.sendHeartbeat(userId, channel), 5000);
        this.hearts.set(heartName, heartHandler);
    },

    stopHeart(userId: UserId, channel: string) {
        const heartName = this.encodeHeartName(userId, channel);
        const heartHandler = this.hearts.get(heartName);
        clearInterval(heartHandler);
    },

    sendHeartbeat(userId: UserId, channel: string): void {
        sendToClient({
            channel,
            event: 'ping',
            data: { userId },
            receiver: "client",
        });
    }
};
