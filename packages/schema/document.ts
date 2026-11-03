import { SCENE_VERSION, type SceneElement } from './index';
import { parseDrawing } from './validation';
export interface AssetMetadata { id:string; mimeType:'image/png'|'image/jpeg'|'image/webp'; size:number; width:number; height:number; name?:string; sha256?:string }
export interface NativeDocument {
  version:typeof SCENE_VERSION;
  id:string;
  elements:SceneElement[];
  assets:Record<string,AssetMetadata>;
  extensions?:Record<string,unknown>;
  [key:string]:unknown;
}
export function validateAssets(value:unknown):Record<string,AssetMetadata>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid asset metadata');
 for(const[id,raw]of Object.entries(value)){const a=raw as AssetMetadata;if(!a||typeof a!=='object'||a.id!==id||!/^[\w-]+$/.test(id)||!['image/png','image/jpeg','image/webp'].includes(a.mimeType)||!Number.isSafeInteger(a.size)||a.size<0||!Number.isFinite(a.width)||a.width<=0||!Number.isFinite(a.height)||a.height<=0||(a.name!==undefined&&typeof a.name!=='string')||(a.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(a.sha256)))throw new Error(`Invalid asset ${id}`);}
 return value as Record<string,AssetMetadata>;
}
export function parseNativeDocument(value:unknown):NativeDocument{
 const elements=parseDrawing(value),document=value as NativeDocument;
 if(typeof document.id!=='string'||!document.id)throw new Error('Native document needs a stable ID');
 validateAssets(document.assets);
 if(document.extensions!==undefined){if(!document.extensions||typeof document.extensions!=='object'||Array.isArray(document.extensions))throw new Error('Invalid extensions');for(const key of Object.keys(document.extensions))if(!/^[a-z][\w.-]*\/[\w.-]+$/.test(key))throw new Error('Extension keys must use a vendor/name namespace');JSON.stringify(document.extensions);}
 return {...document,elements};
}
export function migrateNativeDocument(value:unknown,id:string=crypto.randomUUID()):NativeDocument{
 if(Array.isArray(value))return parseNativeDocument({version:SCENE_VERSION,id,elements:value,assets:{}});
 if(!value||typeof value!=='object')throw new Error('Invalid native document');
 const document=value as Record<string,unknown>;
 if(document.version!==SCENE_VERSION)throw new Error('Unsupported document version. Preserve the original and upgrade Canvas.');
 return parseNativeDocument({...document,id:document.id||id,assets:document.assets||{}});
}
