import {normaliseIconPath} from './path';
export interface IconArtwork { id: string; name: string; aliases: string[]; category: string; tags: string[]; source: string; license: string; guidance?: string; width: number; height: number; paths: { d: string; color: string; stroke?: boolean }[] }
export type IconMode = 'handdrawn' | 'monochrome' | 'original';
export function validateArtwork(value: unknown): IconArtwork {
  const icon = value as IconArtwork;
  if (!icon || typeof icon.id !== 'string' || !icon.id || typeof icon.name !== 'string' || !icon.name || typeof icon.category !== 'string' || typeof icon.source !== 'string' || typeof icon.license !== 'string' || (icon.guidance !== undefined && typeof icon.guidance !== 'string') || !Array.isArray(icon.aliases) || !icon.aliases.every(s => typeof s === 'string') || !Array.isArray(icon.tags) || !icon.tags.every(s => typeof s === 'string') || !Number.isFinite(icon.width) || !Number.isFinite(icon.height) || icon.width <= 0 || icon.height <= 0 || icon.width > 4096 || icon.height > 4096 || !Array.isArray(icon.paths) || !icon.paths.length || icon.paths.length > 100) throw new Error('Invalid icon artwork');
  for (const path of icon.paths) if (typeof path.d !== 'string' || path.d.length > 100000 || !/^[MmZzLlHhVvCcSsQqTtAa0-9eE,.\s+\-]+$/.test(path.d) || !/^#[0-9a-fA-F]{3,8}$/.test(path.color) || (path.stroke !== undefined && typeof path.stroke !== 'boolean')) throw new Error('Unsafe icon path');
  for(const path of icon.paths)normaliseIconPath(path.d);
  return icon;
}
export type IconMetadata=Omit<IconArtwork,'paths'>&{chunk:string};
export function validateMetadata(value:unknown):IconMetadata{
 const metadata=value as IconMetadata;validateArtwork({...metadata,paths:[{d:'M0 0',color:'#000'}]});if(typeof metadata.chunk!=='string'||!/^[a-z0-9-]+$/.test(metadata.chunk))throw new Error('Invalid icon chunk');return metadata;
}
