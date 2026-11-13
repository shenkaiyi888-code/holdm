// Exercise the production evaluator and draw helpers, without a DOM or a second
// copy of the poker rules in the tests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function definition(name){
 const start=source.indexOf('function '+name+'(');
 if(start<0)throw new Error('Missing production helper: '+name);
 const first=source.indexOf('\n',start);
 const end=source.slice(start,first).trimEnd().endsWith('}')?first:source.indexOf('\n}',start)+2;
 return source.slice(start,end);
}
const popcount=source.split('\n').find(line=>line.startsWith('const popcount ='));
const names=['straightTop','topBits','pack','evalHand','chenScore','drawInfo','boardTexture'];
module.exports=vm.runInNewContext('const cr=c=>(c>>2)+2,cs=c=>c&3;\n'+popcount+'\n'+names.map(definition).join('\n')+'\n({evaluate:evalHand,chen:chenScore,draw:drawInfo,texture:boardTexture})');
