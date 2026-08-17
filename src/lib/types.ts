/** Shapes returned by Sleeper's public API (https://docs.sleeper.com).
 *  Fields are optional/nullable where the API has been observed to omit them. */

export interface SleeperPickMetadata {
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
  status?: string;
  injury_status?: string;
  number?: string;
  player_id?: string;
}

export interface SleeperPick {
  draft_id: string;
  draft_slot: number;
  is_keeper: boolean | null;
  metadata: SleeperPickMetadata | null;
  pick_no: number;
  picked_by: string | null;
  player_id: string;
  roster_id: number | null;
  round: number;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string | null;
  status: string;
  type: string;
  season: string;
  sport: string;
  metadata?: {
    name?: string;
    scoring_type?: string;
    description?: string;
  } | null;
  settings?: {
    teams?: number;
    rounds?: number;
    pick_timer?: number;
  } | null;
  /** user_id -> draft slot */
  draft_order: Record<string, number> | null;
  /** draft slot -> roster_id */
  slot_to_roster_id: Record<string, number> | null;
  start_time?: number | null;
  last_picked?: number | null;
}

export interface SleeperLeagueUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string } | null;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

/** A pick flattened into just what the Phase 1 features need. */
export interface DraftedPlayer {
  pickNo: number;
  round: number;
  draftSlot: number;
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  injuryStatus: string | null;
  pickedBy: string | null;
  rosterId: number | null;
  isKeeper: boolean;
}
