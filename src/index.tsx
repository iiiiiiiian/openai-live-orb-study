import {useEffect,useRef} from 'react';
import {createHorizonOrb} from './vanilla.js';
import type {HorizonOrbController,HorizonOrbOptions} from './types.js';
export type {HorizonOrbOptions,HorizonOrbController,OrbState,OrbAudioSource} from './types.js';
export {createHorizonOrb} from './vanilla.js';
export type HorizonOrbProps=HorizonOrbOptions;
export function HorizonOrb(props:HorizonOrbProps){
  const host=useRef<HTMLDivElement>(null),controller=useRef<HorizonOrbController|null>(null);
  const current=useRef(props);current.current=props;
  useEffect(()=>{
    if(!host.current)return;
    const instance=createHorizonOrb(host.current,current.current);controller.current=instance;
    return()=>{instance.dispose();controller.current=null;};
  },[props.assetBaseUrl]);
  useEffect(()=>{controller.current?.update({...props,state:props.state,audioLevel:props.audioLevel,audioSource:props.audioSource,size:props.size,paused:props.paused,className:props.className,onError:props.onError});});
  return <div ref={host} role="img" aria-label={`Voice visualization: ${props.state??'idle'}`} style={{width:props.size??'100%',height:props.size??'100%'}}/>;
}
