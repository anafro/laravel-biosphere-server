import { env } from "bun";
import type { UserId } from "./ws";
import { createRedisClient } from "./redis";

export type BiosphereToken = string;

export type AuthenticationResult = {
    successful: true,
    userId: UserId,
} | {
    successful: false,
    message: string,
};

export type AuthorizationResult = {
    successful: true;
} | {
    successful: false;
    message: string;
}

export async function authenticate(token: BiosphereToken): Promise<AuthenticationResult> {
    const redis = await createRedisClient();
    const userId: string | null = await redis.get(`biosphere:token:${token}`);

    if (userId === null) {
        return {
            successful: false,
            message: 'Biosphere token is invalid or expired, request a new one.',
        }
    }

    return {
        successful: true,
        userId: parseInt(userId),
    }
}

export async function authorize(userId: UserId, channel: string): Promise<AuthorizationResult> {
    const response = await fetch(env.BIOSPHERE_LARAVEL_AUTHORIZE_URL, {
        method: 'POST',
        body: JSON.stringify({
            userId,
            channel
        }),
        headers: {
            'X-Biosphere-Token': env.BIOSPHERE_TOKEN,
        }
    });

    switch (response.status) {
        case 200:
            return {
                successful: true,
            };
        case 403:
            return {
                successful: false,
                message: 'You are not allowed to connect to this Biosphere channel.',
            }
        default:
            return {
                successful: false,
                message: `Server error w/code ${response.status} while authorizing Biosphere request: ${await response.text()}`,
            }
    }
}
