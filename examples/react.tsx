import {HorizonOrb} from '@horizon-lab/horizon-orb-ui/react';
import '@horizon-lab/horizon-orb-ui/styles.css';

export function App(){
  return <main className="orb-stage"><div className="orb-host">
    <HorizonOrb state="listening" audioLevel={0} assetBaseUrl="/authorized-renderer/"/>
  </div></main>;
}
