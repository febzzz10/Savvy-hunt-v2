import sharp from 'sharp';
for (const name of ['handwritten-accent','botanical-accent','brush-stroke']) {
  const {data,info} = await sharp(`public/images/hero/${name}.svg`).resize({width:800}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=0;i<data.length;i+=4) {
    const [r,g,b]=data.subarray(i,i+3);
    if ((g>180 && g-r>65 && g-b>65) || Math.max(r,g,b)<25 || (name==='handwritten-accent' && !(g>100 && g<185 && r>65 && r<165 && b>45 && b<150 && g-r>10 && g-r<70))) data[i+3]=0;
  }
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).webp({quality:92,alphaQuality:100}).toFile(`public/images/hero/${name}-optimized.webp`);
}
