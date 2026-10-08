/** UI input sanitation only; no recovered state machine or audio feature pipeline. */
export const normalizeLevel=(value:number):number=>Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
