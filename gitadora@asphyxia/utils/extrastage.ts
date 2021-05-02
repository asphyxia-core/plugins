import { getVersion } from ".";

interface EncoreStageData {
    level: number
    musics: number[]
    unlock_challenge?: number[]
}

export function getEncoreStageData(info: EamuseInfo): EncoreStageData {
    const fallback = { level: 10, musics: [0] }
    switch (getVersion(info)) {
        case 'nextage':
            return {
                level: 7,
                musics: [ //TODO: check special encore works.
                    2587, 2531, 2612, 2622, 2686,
                    305, 602, 703, 802, 902, 1003, 1201, 1400, 1712, 1916, 2289, 2631, // DD13
                    1704, 1811, 2121, 2201, 2624, // Soranaki 
                    1907, 2020, 2282, 2341, 2666  // Stargazer
                ]
            }
        case 'exchain':
            return {
                level: 13,
                musics: [
                    2498, 2513, 2500, 2529, 2546, 2549, 2548, 2560, 2568, 2576, 5020, 5032, 5031, 5033
                ]
            }
        case 'matixx':
            return {
                level:13,
                musics: [
                    2432, 2445, 2456, 2441, 2444, 2381, 2471, 2476, 2486, 2496, 2497, 2499, 2498
                ]
            }
        default:
            return fallback
    }
}