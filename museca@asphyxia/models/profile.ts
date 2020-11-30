export interface Profile {
    collection: 'profile';

    code: number;
    name: string;
    
    hidden_param: number[];
    play_count: number;
    daily_count: number;
    play_chain: number;
    last: {
      headphone: number;
      appeal_id: number;
      comment_id: number;
      music_id: number;
      music_type: number;
      sort_type: number;
      narrow_down: number;
      gauge_option: number;
    },
    blaster_energy: number;
    blaster_count: number;
    creator_id: number;
    skill_level: number;
    skill_name_id: number;
    gamecoin_packet: number;
    gamecoin_block: number;

    item: {
        [id: number]: {
            type: number,
            param: number
        }
    }

    packet_booster: number;
    block_booster: number;
}