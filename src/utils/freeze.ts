export async function freeze(): Promise<never> {
    await new Promise(() => { });
    throw new Error(`Frozen function got melted (unreachable, might be reached after process kill)`);
}
