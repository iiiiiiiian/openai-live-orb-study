export type OrbState='idle'|'listening'|'thinking'|'speaking'|'disconnected';
/** Caller retains ownership; the UI never opens a microphone or changes the graph. */
export type OrbAudioSource=AnalyserNode|null;
export interface HorizonOrbOptions {
  /** Required: same-origin directory providing frame.html with the documented protocol. */
  assetBaseUrl:string|URL;
  state?:OrbState;
  audioLevel?:number;
  audioSource?:OrbAudioSource;
  size?:number;
  paused?:boolean;
  className?:string;
  onError?:(error:Error)=>void;
}
export interface HorizonOrbController {
  readonly ready:Promise<void>;
  update(options:Partial<HorizonOrbOptions>):void;
  dispose():void;
}
/** UI transport payload, not recovered shader uniforms. */
export interface FrameInput {
  time:number;state:OrbState;level:number;width:number;height:number;reducedMotion:boolean;
}
