export interface Action { id:string;label:string;category:string;binding:string;run:()=>void }
function fuzzy(text:string,word:string):number{const direct=text.indexOf(word);if(direct>=0)return 100-direct*.01;let cursor=0,first=-1;for(const char of word){const found=text.indexOf(char,cursor);if(found<0)return-1;if(first<0)first=found;cursor=found+1;}return 40-(cursor-first-word.length)*.1;}
export class ActionRegistry {
 private actions=new Map<string,Action>();
 constructor(private onRun?:(id:string)=>void,private recent:string[]=[]){ }
 register(action:Action):void{if(this.actions.has(action.id))throw new Error(`Duplicate action: ${action.id}`);this.actions.set(action.id,this.onRun?{...action,run:()=>{this.onRun!(action.id);action.run();}}:action);}
 search(query=''):Action[]{
  const words=query.toLowerCase().split(/\s+/).filter(Boolean);
  return[...this.actions.values()].map(action=>{const text=`${action.label} ${action.category} ${action.binding}`.toLowerCase(),scores=words.map(word=>fuzzy(text,word)),recent=this.recent.indexOf(action.id);return{action,score:scores.some(score=>score<0)?-1:scores.reduce((sum,score)=>sum+score,0)+(recent<0?0:1/(recent+1))};}).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score).map(item=>item.action);
 }
}
