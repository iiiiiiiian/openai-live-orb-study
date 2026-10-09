// Source-based pure functions, NOT a synthetic audio generator or integrated repro.
// conversation-small: uoo/hoo, boo/xoo, Moo. Main: __r.
export function frequencyBands(db, bands) {
  const normalized = new Float32Array(db.slice(0,400)).map(x=>x===-Infinity?0:Math.sqrt(1-Math.max(-100,Math.min(-10,x))*-1/100));
  const width=Math.ceil(normalized.length/bands);
  return Array.from({length:bands},(_,i)=>normalized.slice(i*width,(i+1)*width).reduce((sum,x)=>sum+x,0)/width);
}
function medianGain(values,gain) {
  if(!values.length)return 0;
  const sorted=values.slice().sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  const median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2,c=Math.abs(median)*gain;
  return c/(c+1);
}
export function advancedRaw(db) {
  const magnitudes=frequencyBands(db,240),groups=[[],[],[]],gain=[10,1,1];
  const boundaries=Array.from({length:4},(_,i)=>20*(24000/20)**(i/3));
  magnitudes.forEach((value,i)=>{const frequency=i*48000/(magnitudes.length*2);for(let n=0;n<3;n++)if(frequency>=boundaries[n]&&frequency<boundaries[n+1]){groups[n].push(value);break;}});
  return [...groups.map((values,i)=>medianGain(values,gain[i])),medianGain(magnitudes,1)];
}
export function smoothSnapshot({deltaTimeS, maxDeltaTimeS, audioDataRaw, prevAudioData, prevCumulativeAudioData}) {
  const dt=Math.min(deltaTimeS,maxDeltaTimeS??Infinity), q=1-Math.exp(-dt/2);
  return {audioData:audioDataRaw.map((raw,i)=>prevAudioData[i]+q*(raw*dt*60-prevAudioData[i])),
    cumulativeAudioData:audioDataRaw.map((raw,i)=>{const previous=prevCumulativeAudioData[i];return previous+q*((previous+raw*dt*60*40)-previous);})};
}
export const micLevel=db=>frequencyBands(db,1)[0]*1.55;
// Horizon rn uses the maximum input length and treats missing entries as zero.
export const mergeAssistant=(audio,shout)=>{const length=Math.max(audio.length,shout.length);return length===0?[0,0,0,0]:Array.from({length},(_,i)=>{const a=audio[i]??0,s=shout[i]??0;return a>0&&s>0?(a+s)/2:a>0?a:s;});};
export function stateTargets(normalizedState) {
  return {stateListen:Number(normalizedState==='listening'),stateThink:Number(normalizedState==='thinking'),stateSpeak:Number(normalizedState==='speaking'),stateHalt:Number(normalizedState==='halted')};
}
// Call retarget with the LAST COMMITTED React amount, not an extrapolated amount.
export const transitionAmount=(from,target,startMs,rafMs)=>from+Math.min((rafMs-startMs)/500,1)*(target-from);
