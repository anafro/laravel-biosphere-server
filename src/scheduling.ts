import type { BiosphereMessage } from "./message"
import { sendToServer } from "./redis";

export type ScheduledBiosphereMessage = BiosphereMessage & {
    schedule: string,
    delay: number,
}

export type CancellationBiosphereMessage = BiosphereMessage & {
    cancel: string,
}

export type Schedule = {
    handler: NodeJS.Timeout,
    message: BiosphereMessage,
}

export const scheduler = {
    schedules: new Map<string, Schedule>(),

    schedule(message: ScheduledBiosphereMessage): void {
        const handler = setTimeout(() => this.send(message), message.delay);
        this.schedules.set(message.schedule, { handler, message });
        console.log(`(Scheduler) Scheduled ${message.schedule}`);
    },

    cancel(key: string): void {
        const schedule = this.get(key);
        if (schedule === undefined) {
            console.log(`(Scheduler) Cancelled empty ${key}`);
            return;
        }

        this.schedules.delete(key);
        clearTimeout(schedule.handler);
        console.log(`(Scheduler) Cancelled ${key}`);

    },

    send(message: ScheduledBiosphereMessage): void {
        sendToServer(message);
        console.log(`(Scheduler) Sent ${message.schedule}`);
    },

    get(key: string): Schedule | undefined {
        return this.schedules.get(key);
    },

    isSchedule(maybeSchedule: BiosphereMessage): maybeSchedule is ScheduledBiosphereMessage {
        return Object.hasOwn(maybeSchedule, 'schedule') && Object.hasOwn(maybeSchedule, 'delay');
    },

    isCancellation(maybeSchedule: BiosphereMessage): maybeSchedule is CancellationBiosphereMessage {
        console.log(maybeSchedule);
        return Object.hasOwn(maybeSchedule, 'cancel');
    },
}
