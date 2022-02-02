export function getUID(): string {
    return Math.random().toString(36).substring(2);
}