// Run with Node.js; exercises the existing controller without a browser or network.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
let controller;
const app = {config(){},directive(){},controller(name, value){if(name==='planetAppController')controller=value[value.length-1];}};
const angular = {
  module(){return app;},
  forEach(obj, fn, self){if(obj)Object.keys(obj).forEach(k=>fn.call(self,obj[k],k));},
  fromJson(obj){return typeof obj==='string'?JSON.parse(obj):obj;},
  toJson:JSON.stringify
};
vm.runInNewContext(fs.readFileSync('webapp/src/main/resources/static/js/planetAppController.js','utf8'),{angular,document:{getElementById(){return {offsetHeight:0};}},console:{log(){},debug(){},error(){}},standardContains:(a,x)=>a.indexOf(x)});
const scope={$watch(){}};
const http={get(){return {success(){}};}};
controller(scope,http,{}, {}, {}, {getRegionList(){return {};}});
scope.data={nameMap:{Water:2393},itemDetails:{2268:{tier:0,name:'Aqueous Liquids'},2393:{tier:1,name:'Water'}},schematicMap:{2393:{outputID:2393,outputQuantity:20,cycleTime:1800,recipe:[{typeId:2268,quantity:3000}]}},planetMap:{},resourceMap:{}};
scope.addPlanet();
const p=scope.planets[0];
p.storagefacilities=1;p.launchpads=1;p.useCCStorage=true;p.updateStorage();
assert.equal(p.totalStorage,22500);
p.restrictPads=true;p.updateStorage();assert.equal(p.totalStorage,10000);
p.restrictPads=false;p.launchpads=0;p.useCCStorage=false;p.updateStorage();
p.basics=[{schematic:'Water',number:1,avgActiveCycles:1}];p.updateImportExports();
assert.equal(p.importExport[2268].quantity,-6000); // 3000 units every half hour
assert.equal(p.importExport[2393].quantity,40);
assert.equal(p.importVolume,30);assert.equal(p.exportVolume,7.6);
assert.equal(p.runtime,400); // 12000 / 30
assert.equal(p.importTaxes,1200); // quantities/tax values must not be halved
scope.calledRemoteSuccessfully=true;scope.importMarketSystem=scope.exportMarketSystem=30000142;
scope.im_orderType=scope.ex_orderType='buy';scope.im_marketStatType='min';scope.ex_marketStatType='max';
scope.realMarketPrices={2268:{30000142:{buy:{min:2,max:99}}},2393:{30000142:{buy:{min:1,max:10}}}};
scope.updateMarketPricesByQualifiers();
assert.equal(p.importCostValue,12000);assert.equal(p.exportRevenueValue,400);
assert.equal(scope.totalImportCost,p.importCostValue);assert.equal(scope.totalExportRevenue,p.exportRevenueValue);
const saved=scope.generateSavePlanetJson();
assert.equal(saved.em,'max');assert.equal(saved.ex,undefined);
scope.populateSetupFromJson(saved);assert.equal(scope.ex_marketStatType,'max');
console.log('Planner checks passed: storage, volume, hourly inputs, runtime, tax, price selectors and save round-trip');

// Reconstructed saves explicitly preserve zero rates and false flags.
const zeroSave=JSON.parse(JSON.stringify(saved));
zeroSave.ib=0;zeroSave.eb=0;zeroSave.it=0;zeroSave.et=0;
zeroSave.pl[0].t=0;zeroSave.pl[0].l=0;zeroSave.pl[0].r=false;
scope.populateSetupFromJson(zeroSave);
assert.equal(scope.planets[0].taxRate,0);
assert.equal(scope.planets[0].level,0);
assert.equal(scope.planets[0].restrictPads,false);
assert.equal(scope.im_brokerfees,0);assert.equal(scope.ex_brokerfees,0);
console.log('Cross-frontend save checks passed: zero rates and false flags');
