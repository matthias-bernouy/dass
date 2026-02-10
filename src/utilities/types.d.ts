declare module "*.raw.ts" {
    const content: string;
    export default content;
}

declare module "*.raw" {
    const content: string;
    export default content;
}

declare module "*.raw?raw" {
    const content: string;
    export default content;
}

declare module "*.raw.ts?raw" {
    const content: string;
    export default content;
}

declare module "*.c?raw" {
    const content: string;
    export default content;
}