import {normalizeLevel} from './state.js';
import type {HorizonOrbController,HorizonOrbOptions} from './types.js';
export type {HorizonOrbController,HorizonOrbOptions,OrbState,OrbAudioSource} from './types.js';

/** No global patches, no getUserMedia, no ownership of the caller's audio graph. */
export function createHorizonOrb(host:HTMLElement, initial:HorizonOrbOptions):HorizonOrbController {
  if(!initial?.assetBaseUrl)throw Error('UI-only package: provide assetBaseUrl for a separately authorized renderer');
  const validate=(value:Partial<HorizonOrbOptions>)=>{if(value.size!==undefined&&(!Number.isFinite(value.size)||value.size<=0))throw Error('size must be a positive finite number');};
  validate(initial);
  let options={...initial};
  let disposed=false, loaded=false, waiting=false, raf=0, logicalTime=0, previous:number|undefined;
  const channel=crypto.randomUUID(), iframe=document.createElement('iframe');
  const base=new URL(String(options.assetBaseUrl),document.baseURI);
  const url=new URL('frame.html',base);
  if(url.origin!==location.origin)throw Error('Horizon assets must be hosted on the same origin');
  url.searchParams.set('channel',channel);iframe.src=url.href;iframe.title='Horizon Orb';
  iframe.style.cssText='display:block;border:0;background:transparent;pointer-events:none;';
  iframe.setAttribute('aria-hidden','true');iframe.tabIndex=-1;
  const applySize=()=>{iframe.className=options.className??'';iframe.style.width=options.size===undefined?'100%':`${Math.max(1,options.size)}px`;iframe.style.height=options.size===undefined?'100%':`${Math.max(1,options.size)}px`;};
  applySize();host.append(iframe);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let audioBuffer:Float32Array<ArrayBuffer>|undefined;
  const level=()=>{
    if(options.audioLevel!==undefined)return normalizeLevel(options.audioLevel);
    const analyser=options.audioSource;if(!analyser)return 0;
    if(audioBuffer?.length!==analyser.fftSize)audioBuffer=new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(audioBuffer);
    return normalizeLevel(Math.sqrt(audioBuffer.reduce((sum,x)=>sum+x*x,0)/audioBuffer.length));
  };
  let resolveReady:()=>void=()=>{},rejectReady:(error:Error)=>void=()=>{};
  const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  // Mark handled internally; callers may still await the original promise.
  void ready.catch(()=>{});
  const fail=(error:Error)=>{rejectReady(error);cancelAnimationFrame(raf);options.onError?.(error);};
  let dirty=true;
  const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(iframe);
  const motionChange=()=>{dirty=true;previous=undefined;};motion.addEventListener('change',motionChange);
  let lastDpr=0;
  const tick=(now:number)=>{
    if(disposed)return;
    raf=requestAnimationFrame(tick);
    const dt=previous===undefined?0:Math.max(0,Math.min(now-previous,1000/24));previous=now;
    const dpr=window.devicePixelRatio||1;if(dpr!==lastDpr){lastDpr=dpr;dirty=true;}
    if(document.hidden||!loaded||waiting)return;
    if(!options.paused&&!motion.matches)logicalTime+=dt;
    if(options.paused&&!dirty)return;
    if(motion.matches&&!dirty)return;
    const rect=iframe.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    try{
      const limit=4096; // Product safety cap, not an original-client layout claim.
      const frame={time:logicalTime,state:options.state??'idle',level:level(),width:Math.min(limit,Math.max(1,Math.round(rect.width*dpr))),height:Math.min(limit,Math.max(1,Math.round(rect.height*dpr))),reducedMotion:motion.matches};
      iframe.contentWindow?.postMessage({channel,type:'frame',frame},url.origin);waiting=true;dirty=false;
    }catch(error){fail(error instanceof Error?error:Error(String(error)));}
  };
  const message=(event:MessageEvent)=>{
    if(event.source!==iframe.contentWindow||event.origin!==url.origin||event.data?.channel!==channel)return;
    if(event.data.type==='ready'){loaded=true;clearTimeout(timeout);resolveReady();}
    if(event.data.type==='rendered'){waiting=false;iframe.dataset.rendered='true';}
    if(event.data.type==='error')fail(Error(event.data.message));
  };
  const visibility=()=>{previous=undefined;dirty=true;};document.addEventListener('visibilitychange',visibility);
  window.addEventListener('message',message);
  const timeout=setTimeout(()=>fail(Error('Horizon asset initialization timed out')),15000);
  raf=requestAnimationFrame(tick);
  return {ready,update(patch){if(disposed)throw Error('Horizon Orb is disposed');validate(patch);if(patch.assetBaseUrl!==undefined&&String(patch.assetBaseUrl)!==String(options.assetBaseUrl))throw Error('assetBaseUrl is immutable; recreate the component');options={...options,...patch};applySize();dirty=true;},
    dispose(){if(disposed)return;disposed=true;clearTimeout(timeout);cancelAnimationFrame(raf);observer.disconnect();motion.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('message',message);iframe.contentWindow?.postMessage({channel,type:'dispose'},url.origin);iframe.remove();if(!loaded)rejectReady(Error('Horizon Orb disposed before ready'));audioBuffer=undefined;}};
}
