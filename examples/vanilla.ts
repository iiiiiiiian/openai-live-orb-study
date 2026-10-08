import {createHorizonOrb} from '@horizon-lab/horizon-orb-ui/vanilla';
import '@horizon-lab/horizon-orb-ui/styles.css';

const host=document.querySelector<HTMLElement>('.orb-host')!;
const orb=createHorizonOrb(host,{state:'listening',audioLevel:0,assetBaseUrl:'/authorized-renderer/'});
window.addEventListener('pagehide',()=>orb.dispose(),{once:true});
