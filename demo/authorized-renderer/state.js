export const normalizeLevel = (value) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
/** Product adapter policy, NOT original session/VAD or scheduling parity. */
export class StateAdapter {
    lastTime;
    cumulative = 0;
    snapshot(state, input, time) {
        const level = normalizeLevel(input);
        const dt = this.lastTime === undefined ? 0 : Math.max(0, Math.min((time - this.lastTime) / 1000, 1 / 24));
        this.lastTime = time;
        if (state === 'speaking')
            this.cumulative += level * dt;
        return { assistantOutputLevel: state === 'speaking' ? level : 0,
            connectionRevealAmount: state === 'disconnected' ? 0 : 1,
            preConnectionDotVisibility: state === 'disconnected' ? 1 : 0,
            preConnectionDotColor: [0, 0, 0, 1],
            voiceSnapshot: { stateListen: +(state === 'listening'), stateSpeak: +(state === 'speaking'),
                userSpeakingScale: state === 'listening' ? level : 0,
                assistantWaveformLevel: state === 'speaking' ? level : 0, assistantMotionLevel: state === 'speaking' ? level : 0,
                cumulativeAudio: [this.cumulative, this.cumulative, this.cumulative, 0], micLevel: state === 'listening' ? level : 0 } };
    }
}
