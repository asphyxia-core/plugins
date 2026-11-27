import { GameVersion, VersionInfo } from "../types";
import { qubellRoutes } from "../qubell";

const version: VersionInfo = {
  id: 9, name: "clan", from: 2017062600, until: 2018090000, maxMusicId: 99999999,
};

/**
 * clan is answered with Qubell's handlers for now (its own layout is in
 * bemaniutils' clan.py), but keeps its own version data.
 */
export const Clan: GameVersion = { ...version, routes: qubellRoutes(version) };
