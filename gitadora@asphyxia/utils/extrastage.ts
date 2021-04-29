import { getVersion } from ".";

interface EncoreStageData {
    level: number
    musics: number[]
}

export function getEncoreStageData(info: EamuseInfo): EncoreStageData {
    const fallback = { level: 10, musics: [0] }
    switch (getVersion(info)) {
        case 'nextage':
            return {
                level: 7,
                musics: [
                    2587, 2531, 2612, 2622, 2686, 2631, 2624, 2666
                ]
            }
        case 'exchain':
            return {
                level: 13,
                musics: [
                    2498, 2513, 2500, 2529, 2546, 2549, 2548, 2560, 2568, 2576, 5020, 5032, 5031, 5033
                ]
            }
        default:
            return fallback
    }
}