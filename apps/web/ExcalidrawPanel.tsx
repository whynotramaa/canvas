import {useState} from 'react';
import type {SceneElement} from '../../packages/schema';
import {excalidrawNotices,exportExcalidraw} from '../../packages/schema/excalidraw';
import {createWorkspace,emptyDrawing} from '../../packages/workspace';
import {portableWorkspace} from './assets';
export function ExcalidrawPanel({elements,close}:{elements:SceneElement[];close:()=>void}){
 const[busy,setBusy]=useState(false),[error,setError]=useState('');
 const download=async()=>{setBusy(true);setError('');try{const portable=await portableWorkspace(createWorkspace({...emptyDrawing(),elements})),data=exportExcalidraw(elements,portable.assetBlobs),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='drawing.excalidraw';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){setError(String(error));}finally{setBusy(false);}};
 return <section className="code-panel" role="dialog" aria-modal="false" aria-label="Export Excalidraw"><div className="workspace-heading"><strong>Export Excalidraw</strong><button onClick={close} aria-label="Close Excalidraw export">×</button></div><p>Review the format differences before downloading.</p><ul>{excalidrawNotices(elements).map(notice=><li key={notice}>{notice}</li>)}</ul><button disabled={busy} onClick={()=>void download()}>{busy?'Exporting…':'Download .excalidraw'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
