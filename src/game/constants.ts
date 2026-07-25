export const BOAT_SPEED = 120
export const MAX_TRAIL_POINTS = 1_200
export const TACK_DURATION_SECONDS = 0.5
export const UPWIND_SPEED = 0.8
export const DOOR_WIDTH = 400
export const BEAM_SPEED_FACTOR = 1.5
// forced beaming avoids tacking slowdown, so if you get to that point, you should get penalised instead.
export const FORCED_BEAM_SPEED_FACTOR = 1.25
export const LAYLINE_LENGTH = 12_000
export const WIND_TURN_SPEED = 25 * Math.PI / 180
export const SHIFT_INTENSITY = Math.PI / 4
export const MAX_DEVIATION = Math.PI / 4

// So that distance can be put in approximate number of seconds between gates
export const GATE_DISTANCE_MULTIPLIER = BOAT_SPEED * Math.cos(Math.PI/4);
