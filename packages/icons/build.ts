import {normaliseIconPath} from './path';
import * as simple from 'simple-icons';
import { concepts } from './concepts';
import { validateArtwork, type IconArtwork } from './types';
import {lucidePath} from './lucide';
const brands=Object.keys(simple).filter(key=>key.startsWith('si')&&typeof(simple as any)[key]?.path==='string').map(key=>key.slice(2));
const icons: IconArtwork[] = brands.map(key => {
  const icon = (simple as any)[`si${key}`]; if (!icon) throw new Error(`Missing brand ${key}`);
  return { id: icon.slug, name: icon.title, category: 'brands', aliases: ({ postgresql: ['pg','postgres'], nextdotjs: ['next','nextjs'], apachekafka: ['kafka'], rabbitmq: ['rabbit','mq'], nodedotjs: ['node','nodejs'], googlecloud: ['gcp'] } as Record<string,string[]>)[icon.slug] || [], tags: [icon.title.toLowerCase(), ...(/postgres|mysql|mongo|redis|cassandra|supabase|firebase/i.test(key) ? ['database','storage'] : []), ...(/kafka|rabbit|flink/i.test(key) ? ['queue','events','stream'] : [])], source: icon.source, license: icon.license?.type || 'CC0-1.0 (Simple Icons collection; brand rights apply)', guidance: icon.guidelines || 'Use to identify the product. Brand trademarks and guidelines apply.', width: 24, height: 24, paths: [{ d: icon.path, color: `#${icon.hex}` }] };
});
for (const [id,name,color] of [['aws','Amazon Web Services','#FF9900'],['azure','Microsoft Azure','#0078D4']]) {
  const svg = await Bun.file(new URL(`sources/${id}.svg`, import.meta.url)).text();
  if (/<(?:script|style|image|use|foreignObject)\b|\btransform=|\bon\w+=/i.test(svg)) throw new Error(`Unsupported SVG constructs: ${id}`);
  const paths = [...svg.matchAll(/<path\b([^>]+)>/g)].map(match => { const attrs = match[1]!; const d = attrs.match(/\bd="([^"]+)"/)?.[1]; const fill = attrs.match(/\bfill="(#[0-9a-fA-F]+)"/)?.[1]; if (!d) throw new Error('Path missing'); return { d, color: fill || color! }; });
  icons.push({ id: id!, name: name!, category: 'cloud', aliases: id === 'aws' ? ['amazon','amazonwebservices'] : ['microsoft','az'], tags: ['cloud','infrastructure'], source: `https://github.com/devicons/devicon/tree/master/icons/${id === 'aws' ? 'amazonwebservices' : 'azure'}`, license: 'MIT (Devicon); brand rights apply', guidance: 'Brand mark from Devicon. Handdrawn and monochrome are diagram styling variants; use original mode when brand guidelines require it.', width:128,height:128,paths });
}
for (const [id,concept] of Object.entries(concepts)) icons.push({ id,name:concept.name,category:'system-design',aliases:[],tags:concept.tags,source:'Canvas system-design concept artwork',license:'CC0-1.0',width:24,height:24,paths:[{d:concept.path,color:'#292929',stroke:true}] });
const services = [
 ['aws-ec2','AWS EC2','server'],['aws-lambda','AWS Lambda','function'],['aws-s3','AWS S3','bucket'],['aws-sqs','AWS SQS','queue'],['aws-sns','AWS SNS','pubsub'],['aws-rds','AWS RDS','database'],['aws-dynamodb','AWS DynamoDB','shard'],['aws-eks','AWS EKS','cluster'],['aws-api-gateway','AWS API Gateway','gateway'],['aws-vpc','AWS VPC','network'],['aws-cloudfront','AWS CloudFront','cdn'],['aws-route53','AWS Route 53','dns'],
 ['azure-vm','Azure Virtual Machines','server'],['azure-functions','Azure Functions','function'],['azure-blob','Azure Blob Storage','bucket'],['azure-service-bus','Azure Service Bus','queue'],['azure-cosmos','Azure Cosmos DB','database'],['azure-aks','Azure Kubernetes Service','cluster'],['azure-vnet','Azure Virtual Network','network'],['azure-front-door','Azure Front Door','load-balancer']
];
for (const [id,name,conceptId] of services) { const concept = concepts[conceptId!]!; icons.push({id:id!,name:name!,category:'cloud-services',aliases:[id!.replaceAll('-',' ')],tags:[...concept.tags,id!.startsWith('aws')?'aws':'azure'],source:'Canvas concept artwork; labelled service representation, not an official vendor architecture symbol',license:'CC0-1.0 (concept artwork); service names are trademarks',width:24,height:24,paths:[{d:concept.path,color:'#292929',stroke:true}]}); }
const lucideRoot=new URL('../../node_modules/lucide-react/dist/esm/icons/',import.meta.url);
for await(const file of new Bun.Glob('*.mjs').scan({cwd:lucideRoot.pathname})){const data=(await import(new URL(file,lucideRoot).href)).__iconData;if(!data)continue;icons.push({id:`lucide-${data.name}`,name:data.name.replaceAll('-',' '),category:'general',aliases:[data.name],tags:data.name.split('-'),source:`https://lucide.dev/icons/${data.name}`,license:'ISC (Lucide); licence in sources/LUCIDE-LICENSE',width:data.size,height:data.size,paths:data.node.map(([tag,attrs]:[string,Record<string,string>])=>({d:lucidePath(tag,attrs),color:'#292929',stroke:true}))});}
icons.sort((a,b)=>a.id.localeCompare(b.id));
for(const icon of icons){validateArtwork(icon);icon.paths=icon.paths.map(path=>({...path,d:normaliseIconPath(path.d)}));}
await Bun.write(new URL('catalog.json',import.meta.url),JSON.stringify(icons,null,2));
const groups=new Map<string,IconArtwork[]>();
for(const icon of icons){const shard=icon.category==='brands'?`brands-${/^[a-z]/.test(icon.id)?icon.id[0]:'other'}`:icon.category==='general'?`general-${icon.id.slice(7,8)}`:icon.category;groups.set(shard,[...(groups.get(shard)||[]),icon]);}
const metadata=icons.map(({paths,...icon})=>({...icon,chunk:[...groups].find(([,items])=>items.some(item=>item.id===icon.id))![0]}));
await Bun.write(new URL('index.json',import.meta.url),JSON.stringify(metadata));
const imports=["import catalogPath from './catalog.json' with {type:'file'};","import indexPath from './index.json' with {type:'file'};"],entries:string[]=[];
for(const[shard,items]of groups){await Bun.write(new URL(`chunks/${shard}.json`,import.meta.url),JSON.stringify(items));const name=`chunk${entries.length}`;imports.push(`import ${name} from './chunks/${shard}.json' with {type:'file'};`);entries.push(`${JSON.stringify(shard)}:${name} as unknown as string`);}
await Bun.write(new URL('assets.ts',import.meta.url),imports.join('\n')+`\n// Bun's file loader returns paths; TypeScript infers JSON contents.\nexport const catalogFile=catalogPath as unknown as string,indexFile=indexPath as unknown as string;\nexport const chunks:Record<string,string>={${entries.join(',')}};\n`);
await Bun.write(new URL('sources/LUCIDE-LICENSE',import.meta.url),await Bun.file(new URL('../../node_modules/lucide-react/LICENSE',import.meta.url)).text());
console.log(`Built ${icons.length} icons across ${new Set(icons.map(i=>i.category)).size} categories`);

await Bun.write(new URL('sources/SIMPLE-ICONS-LICENSE.md',import.meta.url),await Bun.file(new URL('../../node_modules/simple-icons/LICENSE.md',import.meta.url)).text());
