import {makeHorizonRenderer} from './horizon-replay.mjs';
function b64(bytes){let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s);}
export async function createLiveRenderer({verifyUploads=false}={}){
  const manifest=await fetch('./horizon-renderer-manifest.json').then(r=>r.json());
  const contextId=Object.keys(manifest.contexts)[0],programs=Object.entries(manifest.programs);
  const interior=programs.find(([,p])=>p.kind==='interior'),composite=programs.find(([,p])=>p.kind==='composite');
  const imageTexture=Object.entries(manifest.textures).find(([,t])=>t.upload?.src)?.[0],targetTexture=Object.entries(manifest.textures).find(([,t])=>!t.upload?.src)?.[0];
  const common={contextId,width:1,height:1,viewport:[0,0,1,1],draw:{method:'drawArrays',args:[4,0,6]},pipeline:{blend:false,depth:false,scissor:false,cull:false,colorMask:[true,true,true,true]}};
  const a={...common,id:0,programId:interior[0],kind:'interior',targetTextureId:targetTexture,textures:{uImage_0:{unit:0,textureId:imageTexture}},regular:{uImage_0:0},blocks:[]};
  const b={...common,id:1,programId:composite[0],kind:'composite',targetTextureId:null,textures:{uInteriorTexture:{unit:1,textureId:targetTexture}},regular:{},blocks:[]};
  const capture={...manifest,draws:[a,b]};
  const renderer=await makeHorizonRenderer(capture,contextId,'local',{verifyUploads});
  return {render(uniforms,width,height,interiorScale=.65,readback=false){
    for(const frame of [a,b]){frame.width=width;frame.height=height;}
    a.viewport=[0,0,Math.max(1,Math.floor(width*interiorScale)),Math.max(1,Math.floor(height*interiorScale))];b.viewport=[0,0,width,height];
    a.blocks=interior[1].blocks.map(block=>{const raw=new Uint8Array(block.size),view=new DataView(raw.buffer);for(const member of block.layout){const key=member.name.replace(/^.*\./,'');if(!(key in uniforms))throw Error('Missing generated input '+key);const values=Array.isArray(uniforms[key])?uniforms[key]:[uniforms[key]];values.forEach((v,i)=>{if(member.type===5125)view.setUint32(member.offset+i*4,v,true);else view.setFloat32(member.offset+i*4,v,true);});}return{name:block.name,data:b64(raw)};});
    b.regular={uInteriorTexture:1};for(const u of composite[1].uniforms){if(u.name==='uInteriorTexture')continue;const key=u.name[1].toLowerCase()+u.name.slice(2);if(!(key in uniforms))throw Error('Missing generated input '+key);b.regular[u.name]=uniforms[key];}
    // The validation renderer can skip readback for live use; uniforms still
    // pass through the exact same tested GL upload/render path.
    return renderer.draw(b,readback);
  },uploadAudit:renderer.uploadAudit,dispose:()=>renderer.dispose()};
}
