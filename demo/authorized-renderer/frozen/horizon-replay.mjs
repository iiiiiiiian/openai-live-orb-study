const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function makeHorizonRenderer(capture, contextId, sourceMode, {verifyUploads=false}={}) {
  const uploadAudit={passes:0,uniformChecks:0,uboBytesChecked:0};
  const old=document.querySelector('#replay'),canvas=document.createElement('canvas');canvas.id='replay';old.replaceWith(canvas);
  const meta=capture.contexts[contextId],gl=canvas.getContext('webgl2',meta.attributes);
  if(!gl)throw Error('WebGL2 unavailable');
  if(meta.drawingBufferColorSpace)gl.drawingBufferColorSpace=meta.drawingBufferColorSpace;
  const programs={},textures={},framebuffers={},sizes={};
  for(const [id,m] of Object.entries(capture.programs))if(m.contextId===contextId){
    const p=gl.createProgram();
    for(const shader of m.shaders){
      const source=sourceMode==='capture'?shader.source:await fetch(`./horizon-${m.kind}.${shader.type===gl.VERTEX_SHADER?'vert':'frag'}.glsl`).then(r=>{if(!r.ok)throw Error('Missing original Horizon shader');return r.text();});
      if(sourceMode==='local'&&source!==shader.source)throw Error('Local and captured shader differ: '+m.kind+' '+shader.type);
      const s=gl.createShader(shader.type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);
    }
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    for(const a of m.geometry){if(a.divisor!==0)throw Error('Unsupported divisor');const loc=gl.getAttribLocation(p,a.name),b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,bytes(a.data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,a.size,a.type,a.normalized,a.stride,a.offset);}
    const buffers={};for(const [binding,b] of m.blocks.entries()){
      const index=gl.getUniformBlockIndex(p,b.name);if(gl.getActiveUniformBlockParameter(p,index,gl.UNIFORM_BLOCK_DATA_SIZE)!==b.size)throw Error('UBO size mismatch');
      const indices=gl.getUniformIndices(p,b.layout.map(u=>u.name)),offsets=gl.getActiveUniforms(p,indices,gl.UNIFORM_OFFSET),types=gl.getActiveUniforms(p,indices,gl.UNIFORM_TYPE);
      if(b.layout.some((u,i)=>u.offset!==offsets[i]||u.type!==types[i]))throw Error('UBO layout mismatch');
      const buffer=gl.createBuffer();gl.bindBuffer(gl.UNIFORM_BUFFER,buffer);gl.bufferData(gl.UNIFORM_BUFFER,b.size,gl.DYNAMIC_DRAW);gl.uniformBlockBinding(p,index,binding);buffers[b.name]={buffer,binding,size:b.size};
    }
    programs[id]={p,vao,buffers,meta:m};
  }
  for(const [id,t] of Object.entries(capture.textures)){
    if(!t.upload)throw Error('Missing texture upload metadata');const u=t.upload,texture=gl.createTexture();textures[id]=texture;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,t.wrapS);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,t.wrapT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,t.minFilter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,t.magFilter);
    if(u.src){if(!u.src.endsWith('/watercolor-cxf1rp88.webp'))throw Error('Unexpected original texture');const image=new Image();image.crossOrigin='anonymous';image.src='./watercolor-cxf1rp88.webp';await image.decode();if(image.width!==u.width||image.height!==u.height)throw Error('Texture size mismatch');gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,u.flipY);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,u.premultiplyAlpha);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,u.colorSpaceConversion);if(u.unpackColorSpace)gl.unpackColorSpace=u.unpackColorSpace;gl.texImage2D(gl.TEXTURE_2D,0,u.internalFormat,u.format,u.type,image);if(u.mipmaps)gl.generateMipmap(gl.TEXTURE_2D);}
    else {gl.texImage2D(gl.TEXTURE_2D,0,u.internalFormat,u.width,u.height,0,u.format,u.type,null);sizes[id]=[u.width,u.height];const fb=gl.createFramebuffer();framebuffers[id]=fb;gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);}
  }
  function pass(f){
    if(f.draw.method!=='drawArrays'||f.draw.args.join(',')!==[gl.TRIANGLES,0,6].join(','))throw Error('Unknown Horizon geometry');
    if(Object.entries(f.pipeline).some(([k,v])=>k!=='colorMask'&&v)||f.pipeline.colorMask.some(v=>!v))throw Error('Non-default GL pipeline unsupported');
    if(canvas.width!==f.width)canvas.width=f.width;if(canvas.height!==f.height)canvas.height=f.height;
    const target=f.targetTextureId;if(target){const [,,w,h]=f.viewport;if(sizes[target]?.join(',')!==[w,h].join(',')){gl.activeTexture(gl.TEXTURE0+1);gl.bindTexture(gl.TEXTURE_2D,textures[target]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);sizes[target]=[w,h];}gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffers[target]);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete replay framebuffer');}else gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(...f.viewport);const p=programs[f.programId];gl.useProgram(p.p);gl.bindVertexArray(p.vao);
    for(const t of Object.values(f.textures)){gl.activeTexture(gl.TEXTURE0+t.unit);gl.bindTexture(gl.TEXTURE_2D,textures[t.textureId]);}
    for(const u of p.meta.uniforms){const loc=gl.getUniformLocation(p.p,u.name),v=f.regular[u.name];if(u.type===gl.SAMPLER_2D||u.type===gl.INT)gl.uniform1i(loc,v);else if(u.type===gl.FLOAT)gl.uniform1f(loc,v);else if(u.type===gl.FLOAT_VEC4)gl.uniform4fv(loc,v);else throw Error('Unsupported uniform '+u.name);}
    for(const b of f.blocks){const buf=p.buffers[b.name],raw=bytes(b.data);if(raw.length!==buf.size)throw Error('Bad captured UBO');gl.bindBuffer(gl.UNIFORM_BUFFER,buf.buffer);gl.bindBufferBase(gl.UNIFORM_BUFFER,buf.binding,buf.buffer);gl.bufferSubData(gl.UNIFORM_BUFFER,0,raw);}
    if(verifyUploads){
      for(const u of p.meta.uniforms){
        const actual=gl.getUniform(p.p,gl.getUniformLocation(p.p,u.name)),expected=f.regular[u.name];
        const a=ArrayBuffer.isView(actual)?Array.from(actual):[actual],e=Array.isArray(expected)?expected:[expected];
        const integer=u.type===gl.INT||u.type===gl.SAMPLER_2D;
        if(a.length!==e.length||a.some((v,i)=>v!==(integer?e[i]:Math.fround(e[i]))))throw Error('GPU uniform mismatch: '+u.name);
        uploadAudit.uniformChecks++;
      }
      for(const b of f.blocks){
        const buf=p.buffers[b.name],expected=bytes(b.data),actual=new Uint8Array(buf.size);
        gl.bindBuffer(gl.UNIFORM_BUFFER,buf.buffer);gl.getBufferSubData(gl.UNIFORM_BUFFER,0,actual);
        if(actual.some((v,i)=>v!==expected[i]))throw Error('GPU UBO bytes mismatch: '+b.name);
        uploadAudit.uboBytesChecked+=actual.length;
      }
      const error=gl.getError();if(error)throw Error('GPU audit GL error '+error);
      uploadAudit.passes++;
    }
    gl.drawArrays(...f.draw.args);
  }
  return {draw(frame,readback=true){
    // Original renderer writes the interior immediately before each composite,
    // except preconnection dot frames, which do not require an interior update.
    const at=capture.draws.findIndex(d=>d.id===frame.id);let interior;
    for(let i=at-1;i>=0;i--){const d=capture.draws[i];if(d.contextId===contextId&&d.kind==='interior'){interior=d;break;}}
    if(interior)pass(interior);else if(frame.regular.uPreConnectionDotVisibility<1)throw Error('Missing upstream interior pass');
    pass(frame);if(!readback)return;const pixels=new Uint8Array(frame.width*frame.height*4);gl.readPixels(0,0,frame.width,frame.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const error=gl.getError();if(error)throw Error('Replay GL error '+error);return pixels;
  },uploadAudit,dispose(){gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
