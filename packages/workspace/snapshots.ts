import { createEntry, emptyDrawing, type Workspace } from './index';
import type { SceneElement } from '../schema';
export interface Snapshot { id: string; name: string; created: number; elements: SceneElement[] }
export function takeSnapshot(elements: SceneElement[], name: string): Snapshot { return { id: crypto.randomUUID(), name: name.trim() || 'Automatic snapshot', created: Date.now(), elements: structuredClone(elements) }; }
export function forkSnapshot(workspace: Workspace, snapshot: Snapshot): Workspace {
  const entry = createEntry('drawing', snapshot.name + ' (fork)');
  return { ...workspace, currentId: entry.id, entries: [...workspace.entries, entry], drawings: { ...workspace.drawings, [entry.id]: { ...emptyDrawing(), elements: structuredClone(snapshot.elements) } } };
}
export interface EditingActivity{activeMs:number;lastEdit:number|null}
export function advanceActivity(activity:EditingActivity,now:number):EditingActivity{
 const elapsed=activity.lastEdit===null?0:Math.max(0,now-activity.lastEdit);return{activeMs:activity.activeMs+(elapsed<=5000?elapsed:0),lastEdit:now};
}
