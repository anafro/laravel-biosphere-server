declare module "bun" {
    interface Env {
        REDIS_HOST: string;
        REDIS_PORT: string;
        REDIS_PASSWORD: string;

        BIOSPHERE_TOKEN: string;
        BIOSPHERE_REDIS_CHANNEL_FROM_SERVER: string;
        BIOSPHERE_REDIS_CHANNEL_TO_SERVER: string;
        BIOSPHERE_LARAVEL_AUTHORIZE_URL: string;
    }
}
