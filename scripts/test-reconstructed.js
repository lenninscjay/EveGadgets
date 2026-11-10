// npm install --no-save jsdom; node scripts/test-reconstructed.js
// Runs the real bundled AngularJS and recovered templates against deterministic
// HTTP fixtures. No market-provider requests or browser layout assertions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root='webapp/src/main/resources/static/reconstructed/';
const data={itemDetails:{2268:{name:'Aqueous Liquids',tier:0},2393:{name:'Water',tier:1}},schematicMap:{2393:{outputID:2393,outputQuantity:20,cycleTime:1800,recipe:[{typeId:2268,quantity:3000}]}},planetMap:{11:{resourceIDs:[2268]},2016:{resourceIDs:[2268]}},resourceMap:{2268:{planetIDs:[11,2016]}}};
let saved,failPrices=false,failData=false,failSave=false,calls=[],warms=0;
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const html=fs.readFileSync(root+'index.html','utf8');
const dom=new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,'').replace('ng-app="gadgets"',''),{url:'http://localhost/reconstructed/index.html#/',runScripts:'outside-only',virtualConsole:vc});
const w=dom.window;
w.eval(fs.readFileSync('webapp/target/generated-resources/static/js/angular-bootstrap.js','utf8'));
for(const match of html.matchAll(/<script src="([^"]+)"/g)){
 if(match[1].startsWith('/'))continue;
 if(fs.existsSync(root+match[1]))w.eval(fs.readFileSync(root+match[1],'utf8'));
}
w.angular.module('gadgets').config(['$provide',function(p){
 p.value('$httpBackend',function(method,url,body,done){
  setTimeout(()=>{
   const u=new URL(url,'http://localhost/reconstructed/');let result,status=200;
   if(u.pathname==='/planetary'){result=data;if(failData)status=500;}
   else if(u.pathname==='/priceAPI/warm'){warms++;result={cache:'ready'};}
   else if(u.pathname==='/priceAPI'){
    calls.push(u.search);result={};if(failPrices){status=502;result={error:'unavailable'};}
    else u.searchParams.get('type').split(',').forEach(id=>{result[id]={};u.searchParams.get('system').split(',').forEach(m=>{
     result[id][m]={buy:{min:2,max:10,percentile:3,wavg:4,median:5,volume:10000},sell:{min:12,max:20,percentile:13,wavg:14,median:15,volume:20000}};
    });});
   }else if(u.pathname==='/persist/saveSetup'){saved=JSON.parse(body);result=failSave?{ERROR:'failure'}:{KEY:'123'};}
   else if(u.pathname==='/persist/getSetupByGet')result={setup:u.searchParams.get('id')==='123'?saved:null};
   else {const file='webapp/src/main/resources/static'+u.pathname;if(fs.existsSync(file))result=fs.readFileSync(file,'utf8');else {status=404;result='missing '+url;}}
   done(status,result,'Content-Type: application/json','');
  },0);
 });
}]);
const inj=w.angular.bootstrap(w.document,['gadgets']),rs=inj.get('$rootScope');
const settle=()=>new Promise(r=>setTimeout(r,30));
function click(text){const el=[...w.document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===text);assert(el,'Missing control '+text);el.click();}
(async()=>{
 await settle();await settle();click('Add Planet');await settle();
 const logic=inj.get('PlanetLogic'),p=logic.planets[0];assert(p);click('Basic');await settle();
 const select=w.document.querySelector('eg-factory-manager select, .well select');assert(select,'Missing reconstructed factory editor');
 // ngOptions has an internal value; select by its rendered label.
 select.value=[...select.options].find(o=>o.textContent==='Water').value;select.dispatchEvent(new w.Event('change',{bubbles:true}));
 p.numStorage=1;p.numLaunchpads=1;p.useCCStorage=true;p.restrictPads=false;p.refreshStorage();assert.equal(p.totalStorage,22500);
 p.restrictPads=true;p.refreshStorage();assert.equal(p.totalStorage,10000);
 p.restrictPads=false;p.numLaunchpads=0;p.useCCStorage=false;p.refreshStorage();assert.equal(p.totalStorage,12000);
 assert.equal(p.importVolume,30);assert.equal(p.exportVolume,7.6);assert.equal(p.runtime,400);assert.equal(p.ioDetails.find(x=>x.id===2268).quantity,-6000);
 logic.importStatistic='min';logic.exportStatistic='max';logic.importOrderType='buy';logic.exportOrderType='sell';logic.exportMarketId='30000142';p.taxRate=0;p.refreshTaxes();rs.$digest();
 click('Market Details');await settle();await settle();
 assert.equal(logic.totalHourlyImportCost,12000);assert.equal(logic.totalHourlyExportRevenue,800);assert.equal(calls.length,1);assert.equal(warms,1);
 assert(calls[0].includes('2268')&&calls[0].includes('2393')&&calls[0].includes('30000142'));
 click('Save current setup');await settle();await settle();assert(w.document.body.textContent.includes('Successfully saved setup'));
 assert([...w.document.querySelectorAll('a')].some(a=>a.href==='http://localhost/reconstructed/index.html#/123'));
 assert.equal(saved.em,'max');assert.equal(saved.im,'min');assert.equal(saved.pl[0].t,0);
 logic.planets=[];logic.loadSetup('123');await settle();await settle();assert.equal(logic.planets[0].taxRate,0);assert.equal(logic.exportMarketId,'30000142');
 click('Planet 1');await settle();click('Add prerequisites');assert.equal(logic.planets[0].extractors.length,1);
 failPrices=true;click('Market Details');await settle();await settle();assert.equal(logic.pricesReady,false);assert(w.document.body.textContent.includes('Prices unavailable'));
 click('Planet 1');await settle();click('Remove factory');assert.equal(logic.planets[0].factoriesBasic.length,0);
 logic.loadSetup('999');await settle();assert.equal(logic.failedLoad,true);
 // Both UI families serialize this exact compact save schema, including zero values.
 const persist=inj.get('persistHandler');const decoded=persist.decode({pl:[{b:[{s:2393,n:2,a:2}],c:true,t:0,l:0,r:false}],im:'avg',em:'fivePercent'});
 assert.equal(decoded.planets[0].useCCStorage,true);assert.equal(decoded.planets[0].taxRate,0);assert.equal(decoded.planets[0].level,0);assert.equal(decoded.importStatistic,'wavg');assert.equal(decoded.exportStatistic,'percentile');
 // Save failure should display the failure template, not an unhandled exception.
 failSave=true;click('Save current setup');await settle();await settle();
 assert(w.document.body.textContent.includes('not correctly saved'));
 // Reject a failed data load so the router presents a visible error instead of hanging.
 failData=true;inj.get('$route').reload();rs.$digest();await settle();await settle();
 assert(w.document.body.textContent.includes('Could not load PI data'));
 assert.deepEqual(errors,[]);
 console.log('Reconstruction DOM checks passed: Angular routing/templates, editor, calculations, batching, independent prices, save/load, prerequisites, deletion and API failure states.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
