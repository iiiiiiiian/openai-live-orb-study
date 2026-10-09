import {advancedRaw,micLevel,smoothSnapshot,mergeAssistant} from './recovered-runtime.mjs';
import {HorizonDynamics,capDelta,spring,emptySnapshot} from './horizon-dynamics.mjs';

// Mirrors the separate uoo and Foo clocks; browser/React scheduling parity
// must still be measured rather than assumed from these nominal intervals.
export class AudioSnapshotTap {
  constructor(track,{role='assistant',onSample=()=>{}}={}){
    this.track=track;this.role=role;this.context=new AudioContext({latencyHint:'interactive'});
    this.source=this.context.createMediaStreamSource(new MediaStream([track]));
    this.analyser=this.context.createAnalyser();Object.assign(this.analyser,{fftSize:2048,smoothingTimeConstant:.8,minDecibels:-100,maxDecibels:-80});
    this.source.connect(this.analyser);this.fft=new Float32Array(1024);this.raw=[0,0,0,0];this.snapshot={audioData:[0,0,0,0],cumulativeAudioData:[0,0,0,0],rawAudioData:this.raw};this.mic=0;
    this.previous=performance.now();
    this.analysisTimer=setInterval(()=>{this.analyser.getFloatFrequencyData(this.fft);if(role==='mic')this.mic=micLevel(this.fft);else this.raw=advancedRaw(this.fft);onSample({role,timestamp:performance.now(),sampleRate:this.context.sampleRate,micLevel:this.mic,raw:this.raw.slice()});},role==='mic'?32:16);
    if(role!=='mic')this.integrationTimer=setInterval(()=>{const now=performance.now();this.snapshot={...smoothSnapshot({deltaTimeS:(now-this.previous)/1000,maxDeltaTimeS:1/24,audioDataRaw:this.raw,prevAudioData:this.snapshot.audioData,prevCumulativeAudioData:this.snapshot.cumulativeAudioData}),rawAudioData:this.raw.slice()};this.previous=now;},16);
  }
  async resume(){await this.context.resume();}
  async destroy(){clearInterval(this.analysisTimer);clearInterval(this.integrationTimer);this.source.disconnect();await this.context.close();}
}
export class LinearTransition {
  constructor(value=0,duration=500){this.amount=value;this.target=value;this.from=value;this.start=0;this.duration=duration;}
  set(target,now){if(target!==this.target){this.from=this.amount;this.start=now;this.target=target;}}
  tick(now){this.amount=this.from+Math.min(Math.max((now-this.start)/this.duration,0),1)*(this.target-this.from);return this.amount;}
}
export function normalizeVoiceState({connectionState,remoteState,isUserSpeaking,isAssistantSpeaking,trigger='energy'}){
  if(connectionState==='connected')return trigger==='energy'&&isUserSpeaking?'listening':trigger==='energy'&&isAssistantSpeaking?'speaking':remoteState;
  return connectionState==='disconnected'?'halted':null;
}
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const zero={audioData:[0,0,0,0],rawAudioData:[0,0,0,0],cumulativeAudioData:[0,0,0,0]};
export class HorizonInputPipeline {
  constructor(){this.session={connectionState:null,remoteState:'idle',isUserSpeaking:false,isAssistantSpeaking:false};this.transitions={listen:new LinearTransition(),speak:new LinearTransition(),user:new LinearTransition(0,140),connected:new LinearTransition()};this.mic=null;this.audio=null;this.shout=null;}
  setSession(patch,now=performance.now()){
    Object.assign(this.session,patch);const state=normalizeVoiceState(this.session);
    this.transitions.listen.set(+(state==='listening'),now);this.transitions.speak.set(+(state==='speaking'),now);this.transitions.user.set(+this.session.isUserSpeaking,now);this.transitions.connected.set(+(this.session.connectionState==='connected'),now);
  }
  snapshot(now){
    const audio=this.audio?.snapshot??zero,shout=this.shout?.snapshot??zero;
    const data=mergeAssistant(audio.audioData,shout.audioData),raw=mergeAssistant(audio.rawAudioData,shout.rawAudioData),cumulative=mergeAssistant(audio.cumulativeAudioData,shout.cumulativeAudioData);
    return {assistantOutputLevel:mean(raw.slice(0,3)),connectionRevealAmount:this.transitions.connected.tick(now),preConnectionDotVisibility:+(this.session.connectionState!=='connected'),preConnectionDotColor:[0,0,0,1],voiceSnapshot:{stateListen:this.transitions.listen.tick(now),stateSpeak:this.transitions.speak.tick(now),userSpeakingScale:this.transitions.user.tick(now),assistantWaveformLevel:mean(data),assistantMotionLevel:Math.max(...data.slice(0,3)),cumulativeAudio:cumulative,micLevel:this.mic?.mic??0}};
  }
}
export class HorizonFrameGenerator {
  constructor({displayScale=1,wingman=true,reducedMotion=false,paletteIndex=0}={}){this.options={displayScale,wingman,reducedMotion,paletteIndex};this.dynamics=new HorizonDynamics();this.previous=null;this.wave=1;this.base=1;this.flow=1;this.surface=displayScale/(wingman?1.15:1);this.velocity=0;}
  frame(timestamp,snapshot){
    const o=this.options,s=snapshot.voiceSnapshot??emptySnapshot,dt=capDelta(this.previous===null?0:(timestamp-this.previous)/1000),maximum=o.wingman?1.15:1;
    const energy=o.reducedMotion?0:Math.min(Math.max((snapshot.assistantOutputLevel??s.assistantWaveformLevel)*1.5,0),1),target=o.displayScale*(1+(maximum-1)*energy**.35)/maximum;
    const scale=spring(this.surface,this.velocity,target,dt,4,1);this.surface=scale.value;this.velocity=scale.velocity;
    const motion=this.previous===null?this.dynamics.initialOutput():this.dynamics.update(s,dt);
    if(this.previous!==null){this.wave+=dt*24*motion.waveMotionSpeed;this.base+=dt*24;this.flow+=dt*24*motion.textureFlowSpeed;}
    this.previous=timestamp;
    return {paletteIndex:o.paletteIndex,waveFrame:this.wave,baseShaderFrame:this.base,waveAmplitude:motion.waveAmplitude,textureFlowFrame:this.flow,textureEdgeWarp:motion.textureEdgeWarp,listeningTextureNoiseScale:motion.listeningTextureNoiseScale,micLevel:s.micLevel,surfaceScale:this.surface,userSpeakingScale:s.userSpeakingScale,connectionRevealAmount:snapshot.connectionRevealAmount,preConnectionDotVisibility:snapshot.preConnectionDotVisibility,preConnectionDotColor:snapshot.preConnectionDotColor,speakingWatercolorOffset0:motion.speakingWatercolorOffsets[0].slice(),speakingWatercolorOffset1:motion.speakingWatercolorOffsets[1].slice(),speakingWatercolorOffset2:motion.speakingWatercolorOffsets[2].slice()};
  }
}
