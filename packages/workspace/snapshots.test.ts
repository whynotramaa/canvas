import { expect, test } from 'bun:test';
import { forkSnapshot, takeSnapshot } from './snapshots';
import { createWorkspace } from './index';
test('snapshots and forks do not mutate the source drawing', () => {
  const w = createWorkspace(); const snapshot = takeSnapshot(w.drawings[w.currentId]!.elements, 'Before review');
  const fork = forkSnapshot(w, snapshot);
  expect(fork.entries).toHaveLength(2); expect(w.entries).toHaveLength(1);
  expect(fork.drawings[fork.currentId]!.elements).not.toBe(snapshot.elements);
});
import{advanceActivity}from'./snapshots';
test('automatic snapshot activity counts editing bursts and excludes long idle gaps',()=>{
 let activity={activeMs:0,lastEdit:null as number|null};activity=advanceActivity(activity,1000);activity=advanceActivity(activity,2000);expect(activity.activeMs).toBe(1000);activity=advanceActivity(activity,602000);expect(activity.activeMs).toBe(1000);activity=advanceActivity(activity,603000);expect(activity.activeMs).toBe(2000);
});
