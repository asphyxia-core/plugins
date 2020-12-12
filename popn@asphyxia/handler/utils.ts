export const getVersion = (info: EamuseInfo) => {
    const moduleName: string = info.module;
    return `v${moduleName.match(/[0-9]+/)[0]}`;
};