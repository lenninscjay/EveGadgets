var app = angular.module('PlanetModel', ['PlanetData']);

app.factory('Planet', ['FACILITIES', 'PRODUCT', 'LEVEL', 'PiDataModel',
                       function(FACILITIES, PRODUCT, LEVEL, PiData) {

	function arrayObjectIndexOf(array, term, property){
		for(var i = 0; i < array.length; i++){
			if(array[i][property] == term) return i;
		}
		return -1;
	}

	function Planet(argName){
		//console.log("Inside Planet.constructor");
//		console.log("data connection in Planet: " + angular.toJson(PiData.getData().planetMap[11]));
		this.name = argName;
		this.factoriesBasic = []
		this.factoriesAdvanced = []
		this.factoriesHightech = []
		this.extractors = []; //{resourceId: INT, headcount: INT}
		this.numStorage = 0;
		this.numLaunchpads = 0;
		this.allowedPlanets = []; //needs init
		this.useCCStorage = false;
		this.restrictPads = true;
		this.taxRate = 6;
		this.level = 4;
		this.avgLinkLength = 200;
		this.cyclesPerActiveCycle = 1;
		this.isFactoryPlanet = false;

		//cpu, powergrid, planetID, importVolume, exportVolume, importTaxes, exportTaxes, importExport{}, cost, totalStorage, runtime, resourceDatalist, totalProfit
		this.CPU = 0;
		this.Grid = 0;
		this.Cost = 0;
		this.totalStorage = 0;
		this.importVolume = 0;
		this.exportVolume = 0;

		this.importTaxes = 0;
		this.exportTaxes = 0;

		this.runtime = 0;

		this.ioDetails = [];
		this.resourceDatalist = [];

		this.refreshAllowedPlanets();
	};

	Planet.prototype = {
		check: function(){
			console.log("planet is working");
		},
		addBasic: function(){
			//console.log("Inside Planet.addBasic");
			this.factoriesBasic.push({schematic:0, number: 1, avgActiveCycles: 1});
			this.refreshFitting();
		},
		deleteBasic: function(f){
			//console.log("Inside Planet.deleteBasic with arg: " + angular.toJson(f));
			var sch = f.schematic;
			var num = f.number;
			var index = this.factoriesBasic.indexOf(f);
			this.factoriesBasic.splice(index, 1);
			this.refreshFitting();
			if(num){ //truthy?
				this.refreshFitting();
				if(sch) {
					this.refreshImportExports();
				}
			}
		},
		addAdvanced: function(){
			//console.log("Inside Planet.addAdvanced");
			this.factoriesAdvanced.push({schematic:0, number: 1, avgActiveCycles: 1});
			this.refreshFitting();
		},
		deleteAdvanced: function(f){
			//console.log("Inside Planet.deleteAdvanced with arg: " + angular.toJson(f));
			var sch = f.schematic;
			var num = f.number;
			var index = this.factoriesAdvanced.indexOf(f);
			this.factoriesAdvanced.splice(index, 1);
			if(num){ //truthy?
				this.refreshFitting();
				if(sch) {
					this.refreshImportExports();
				}
			}
		},
		addHightech: function(){
			//console.log("Inside Planet.addHightech");
			this.factoriesHightech.push({schematic:0, number: 1, avgActiveCycles: 1});
			this.refreshFitting();
			if(this.factoriesHightech.length == 1){
				this.refreshAllowedPlanets();
			}
		},
		deleteHightech: function(f){
			//console.log("Inside Planet.deleteHightech with arg: " + angular.toJson(f));
			var sch = f.schematic;
			var num = f.number;
			var index = this.factoriesHightech.indexOf(f);
			this.factoriesHightech.splice(index, 1);
			this.refreshFitting();
			if(this.factoriesHightech.length == 0){
				this.refreshAllowedPlanets();
			}
			if(num){ //truthy?
				this.refreshFitting();
				if(sch) {
					this.refreshImportExports();
				}
			}
		},
		addExtractor: function(){
			//console.log("Inside Planet.addExtractor");
			this.extractors.push({resourceId: 0, headcount: 0, yieldPerHour: 12000});
			this.refreshFitting();
		},
		deleteExtractor: function(e){
			//console.log("Inside Planet.deleteExtractor with arg: " + angular.toJson(e));
			var sch = e.resourceId;
			var index = this.extractors.indexOf(e);
			this.extractors.splice(index, 1);
			this.refreshFitting();
			if(sch) {
				this.refreshAllowedPlanets();
				this.refreshImportExports();
			}
		},
		refreshStorage: function(){
			this.numStorage = Math.max(0, this.numStorage || 0);
            this.numLaunchpads = Math.max(0, this.numLaunchpads || 0);
			if(this.restrictPads){
				this.totalStorage = Math.max(0, this.numLaunchpads) * 10000
			}
			else {
				this.totalStorage = this.numStorage * 12000 +
					this.numLaunchpads * 10000 +
					this.useCCStorage * 500
			}
				//constant. This makes me sad.
			this.refreshFitting();
			this.refreshRuntime();
		},
		getEffectiveIoDetails: function(){
			if(this.cyclesPerActiveCycle == 1){
				return this.ioDetails;
			}
			var effectiveIoDetails = [];
			angular.forEach(this.ioDetails, function(item){
				effectiveIoDetails.push({id: item.id, quantity: item.quantity / this.cyclesPerActiveCycle})
			}, this)
			return effectiveIoDetails;
		},
		refreshImportExports: function(){
			//console.log("Inside Planet.refreshImportExports");
			/* 1. Iterate over all factories and build ioList (schematic vs Factory number/active)
			 * 2. Update storage
			 * 3. Update taxes
			 */
			angular.forEach(this.ioDetails, function(item){
				item.quantity = 0;
			})
			this.ioFactoryHelper(this.factoriesBasic, 2);
			this.ioFactoryHelper(this.factoriesAdvanced, 1);
			this.ioFactoryHelper(this.factoriesHightech, 1);
            // Do not splice while iterating: adjacent zero flows must all disappear.
            this.ioDetails = this.ioDetails.filter(function(io){return io.quantity !== 0;});

            var balances = {};
            this.invalidExtractorYield = false;
            angular.forEach(this.extractors, function(e){
                if (!e.resourceId) return;
                var id = e.resourceId;
                var index = arrayObjectIndexOf(this.ioDetails,id,'id');
                if (!balances[id]) balances[id] = {id:id, demand:index < 0 ? 0 : Math.max(0,-this.ioDetails[index].quantity), yieldPerHour:0};
                var yieldPerHour = e.yieldPerHour;
                if (typeof yieldPerHour !== 'number' || !isFinite(yieldPerHour) || yieldPerHour < 0) {
                    this.invalidExtractorYield = true;
                    yieldPerHour = 0;
                }
                balances[id].yieldPerHour += yieldPerHour;
                if (index >= 0) this.ioDetails[index].quantity += yieldPerHour;
                else this.ioDetails.push({id:id,quantity:yieldPerHour});
            },this);
            this.extractionBalance = Object.keys(balances).map(function(id){
                var balance = balances[id];
                balance.shortfall = Math.max(0,balance.demand-balance.yieldPerHour);
                balance.surplus = Math.max(0,balance.yieldPerHour-balance.demand);
                return balance;
            });
            this.ioDetails = this.ioDetails.filter(function(io){return io.quantity !== 0;});

			this.refreshRuntime();
			this.refreshTaxes();
		},
		ioFactoryHelper : function(factoryList, speed){
			//console.log("Inside Planet.ioFactoryHelper with arg: " + angular.toJson(factoryList));
			//how to make this private?
//			console.log("ioFactoryHelper : " + angular.toJson(factoryList));
			angular.forEach(factoryList, function(factory){
				// console.log("ioHelper: " + angular.toJson(factory));
				if(factory.schematic && factory.number >= 0 && factory.avgActiveCycles >= 1){
					var item = PiData.getData().schematicMap[factory.schematic];
                    if (!item) return;
                    speed = 3600 / item.cycleTime;
//					console.log("ioFactoryHelper: Working on " + angular.toJson(item));
					var index = arrayObjectIndexOf(this.ioDetails, item.outputID, "id");
					if(index >= 0){
						this.ioDetails[index].quantity += item.quantity * factory.number * speed / factory.avgActiveCycles;
					} else{
						this.ioDetails.push({
							id: item.outputID,
							quantity: item.quantity * factory.number * speed / factory.avgActiveCycles
						})
					}
					angular.forEach(item.recipe, function(component){
						var componentIndex = arrayObjectIndexOf(this.ioDetails, component.typeid, "id");
						if(componentIndex >= 0) {
							this.ioDetails[componentIndex].quantity -=
								component.quantity * factory.number * speed / factory.avgActiveCycles;
						} else{
							this.ioDetails.push({
								id: component.typeid,
								quantity: component.quantity * factory.number * speed / factory.avgActiveCycles * -1
							})
						}
					},this)
				}
			},this)
		},
		refreshRuntime: function(){
//			console.log("refreshRuntime prereqs: " + angular.toJson(PRODUCT))
			this.importVolume = 0;
			this.exportVolume = 0;
			angular.forEach(this.ioDetails, function(item){
//				console.log("refreshRuntime: " + angular.toJson(item) + ", " + angular.toJson(PiData.getData().itemDetails[item.id]) +
//						", " + PRODUCT.TIER_VOLUME[PiData.getData().itemDetails[item.id].tier])
				// console.log(angular.toJson(item));
				if(item.quantity > 0){
					var details = PiData.getData().itemDetails[item.id];
					var tier = details.tier;
					this.exportVolume += item.quantity * PRODUCT.TIER_VOLUME[tier]
				} else if (item.quantity < 0){
					var details = PiData.getData().itemDetails[item.id];
					var tier = details.tier;
					this.importVolume -= item.quantity * PRODUCT.TIER_VOLUME[tier] //quantity is negative, this is += x*-1
				} //else item.quantity === 0, meaning extractor output and who knows what quantity
			}, this)
			if(this.importVolume == 0 && this.exportVolume == 0){
				this.runtime = 0
			} else if(this.importVolume > this.exportVolume){
				if(this.importVolume > 0){
					this.runtime = Math.floor(this.totalStorage / this.importVolume);
				} //runtime = infinite?
			} else if (this.exportVolume >= this.importVolume){
				if(this.exportVolume > 0){
					this.runtime = Math.floor(this.totalStorage / this.exportVolume);
				} //runtime = infinite?
			}
			// console.log("import volume: " + this.importVolume + ", ExportVolume: " + this.exportVolume);
		},
		refreshTaxes: function(){
			//console.log("Inside Planet.refreshTaxes");
			this.exportTaxes = 0;
			this.importTaxes = 0;
			angular.forEach(this.ioDetails, function(item){
				if(item.quantity > 0){
					var details = PiData.getData().itemDetails[item.id];
					var tier = details.tier;
					this.exportTaxes += item.quantity * PRODUCT.TIER_COST[tier] * this.taxRate/100
				} else if (item.quantity < 0){
					var details = PiData.getData().itemDetails[item.id];
					var tier = details.tier;
					console.log("Import Taxes: ", item.quantity, tier, this.taxRate, PRODUCT.TIER_COST[tier])
					this.importTaxes -= item.quantity * PRODUCT.TIER_COST[tier] * this.taxRate/100 *0.5 //import taxe are halved
				} //else item.quantity === 0, meaning extractor output and who knows what quantity
			}, this)
		},
		refreshAllowedPlanets: function(){
			//console.log("Inside Planet.refreshAllowedPlanets");
			var potentials = [];
			var allowed = [];
			if(this.factoriesHightech.length){
				potentials.push("11");
				potentials.push("2016");
			} else {
				angular.forEach(PiData.getData().planetMap, function(val, id){
					potentials.push(id);
				})
			}
			//note that equality is weird. indexOf uses ===, might need a separate function for ==
			angular.forEach(potentials, function(id){
				var planetHasAllResources = true;
				var resources = PiData.getData().planetMap[id]
				if(!resources){
					//should only trigger if shit happens
					console.error("refreshAllowedPlanets: Shit Happened. Probably your fault");
				} else if (this.extractors.length > 0){
					// console.log("refreshAllowedPlanets: checking planet " + id + " with " + resources);
					angular.forEach(this.extractors, function(e){
						// console.log("refreshAllowedPlanets, " + angular.toJson(e));
						if(e.resourceId && resources.indexOf(e.resourceId) == -1){
							planetHasAllResources = false;
						}
					})
					if(planetHasAllResources){
						// console.log("planet has all resources");
						allowed.push(id);
					}
					// else {console.log("planet did not have all resources")}
				} else { //if no extractors, no logic. Therefore...
					allowed = potentials;
				}
			}, this)
			// console.log("allowed planet list populated: " + angular.toJson(allowed));
			this.allowedPlanets = allowed;
			this.refreshResourceDatalist();
		},
		refreshResourceDatalist: function(){
			//console.log("Inside Planet.refreshResourceDatalist");
			var datalist = [];
			angular.forEach(this.allowedPlanets, function(p){
				angular.forEach(PiData.getData().planetMap[p], function(resource){
					if(datalist.indexOf(resource) == -1){
						datalist.push(resource);
					}
				})
			})
			var resourceList = [];
			angular.forEach(datalist, function(id){
				resourceList.push({id: id, name: PiData.getData().itemDetails[id].name})
			})
			this.resourceDatalist = resourceList;
		},
		refreshFitting: function(){
			//console.log("Inside Planet.refreshFitting");
			var numBasicFactories = 0;
			var numAdvancedFactories = 0;
			var numHightechFactories = 0;
			var numExtractors = 0;
			var numExtractorHeads = 0;

			angular.forEach(this.factoriesBasic, function(factory){
				if(!(factory.number >= 0)) { factory.number = 0 };
				numBasicFactories += factory.number
			})
			angular.forEach(this.factoriesAdvanced, function(factory){
				if(!(factory.number >= 0)) { factory.number = 0 };
				numAdvancedFactories += factory.number
			})
			angular.forEach(this.factoriesHightech, function(factory){
				if(!(factory.number >= 0)) { factory.number = 0 };
				numHightechFactories += factory.number
			})
			angular.forEach(this.extractors, function(e){
				numExtractors += 1
				numExtractorHeads += e.headcount
			})

			var numFacilities = numBasicFactories + numAdvancedFactories + numHightechFactories + numExtractors +
				this.numLaunchpads + this.numStorage;
			if(this.useCCStorage) {numFacilities += 1};

			this.CPU = numBasicFactories * FACILITIES.BASIC_FACTORY.CPU +
				numAdvancedFactories * FACILITIES.ADVANCED_FACTORY.CPU +
				numHightechFactories * FACILITIES.HIGHTECH_FACTORY.CPU +
				numExtractors * FACILITIES.E_CONTROL.CPU +
				numExtractorHeads * FACILITIES.E_HEAD.CPU +
				this.numStorage * FACILITIES.STORAGE.CPU +
				this.numLaunchpads * FACILITIES.LAUNCHPAD.CPU +
				numFacilities * this.avgLinkLength * FACILITIES.LINK.CPU;
			this.Grid = numBasicFactories * FACILITIES.BASIC_FACTORY.GRID +
				numAdvancedFactories * FACILITIES.ADVANCED_FACTORY.GRID +
				numHightechFactories * FACILITIES.HIGHTECH_FACTORY.GRID +
				numExtractors * FACILITIES.E_CONTROL.GRID +
				numExtractorHeads * FACILITIES.E_HEAD.GRID +
				this.numStorage * FACILITIES.STORAGE.GRID +
				this.numLaunchpads * FACILITIES.LAUNCHPAD.GRID +
				numFacilities * this.avgLinkLength * FACILITIES.LINK.GRID;
			this.Cost = numBasicFactories * FACILITIES.BASIC_FACTORY.COST +
				numAdvancedFactories * FACILITIES.ADVANCED_FACTORY.COST +
				numHightechFactories * FACILITIES.HIGHTECH_FACTORY.COST +
				numExtractors * FACILITIES.E_CONTROL.COST +
				numExtractorHeads * FACILITIES.E_HEAD.COST +
				this.numStorage * FACILITIES.STORAGE.COST +
				this.numLaunchpads * FACILITIES.LAUNCHPAD.COST +
				numFacilities * this.avgLinkLength * FACILITIES.LINK.COST +
				LEVEL.LEVEL[this.level].COST;
		},
		addPrerequisiteProduction: function(factory){
			//console.log("Inside Planet.addPrerequisiteProduction with args: " + angular.toJson(factory));
			if(!factory.schematic){
				console.log("No schematic to get prerequisites for!");
				return;
			}
			if(PiData.getData().itemDetails[factory.schematic].tier == 0){
				console.log("Raw materials have no prerequisites!"); //shouldn't trigger... probably.
			}
			var baseSchematic = PiData.getData().schematicMap[factory.schematic]
			// console.log("baseSchematic: " + angular.toJson(baseSchematic));
			angular.forEach(baseSchematic.recipe, function(component){
                // Defensive guard for old/malformed datasets; output is never a prerequisite.
                if (String(component.typeid) === String(baseSchematic.outputID)) return;
				var componentData = PiData.getData().itemDetails[component.typeid];
				var compschematic = PiData.getData().schematicMap[component.typeid];
				// console.log("componentData: " + angular.toJson(componentData));
				if(componentData.tier == 1){
					// console.log("adding basic")
					this.factoriesBasic.push({schematic:''+component.typeid, number: Math.ceil(factory.number * component.quantity / compschematic.quantity * compschematic.cycleTime / baseSchematic.cycleTime / factory.avgActiveCycles), avgActiveCycles: 1});
				}
				else if(componentData.tier == 2 || componentData.tier == 3){
					// console.log("adding advanced")
					this.factoriesAdvanced.push({schematic:''+component.typeid, number: Math.ceil(factory.number * component.quantity / compschematic.quantity * compschematic.cycleTime / baseSchematic.cycleTime / factory.avgActiveCycles), avgActiveCycles: 1});
				}
				else if(componentData.tier == 4){
					// console.log("adding... hightech? As a prerequisite?")
					this.factoriesHightech.push({schematic:''+component.typeid, number: factory.number * component.quantity, avgActiveCycles: 1});
				}
				else if(componentData.tier == 0){
					//add extractor after checking whether you can
					if(arrayObjectIndexOf(this.resourceDatalist, component.typeid, "id") >= 0){
						// console.log("adding extractor");
						this.extractors.push({resourceId:component.typeid, headcount: 0, yieldPerHour: 12000}); // no idea why this is different
						//this.refreshFitting();
						//this.refreshAllowedPlanets();
						//this.refreshImportExports();
					} else {
						console.error("Cannot add extractor: planet-resource combination does not exist");
					}
    			}
			this.refreshFitting();
			this.refreshAllowedPlanets();
			this.refreshImportExports();

			},this)
		},
		isCpuOverloaded: function(){
			return (this.CPU > LEVEL.LEVEL[this.level].CPU);
		},
		isGridOverloaded: function(){
			return (this.Grid > LEVEL.LEVEL[this.level].GRID);
		},
		isLowRuntime: function(){
			return (this.runtime < 48);
		},
		isBadFactory: function(){
			return (this.cyclesPerActiveCycle == 1 && this.importVolume > 0);
		},
		isWithoutLaunchpads : function(){
			return (this.numLaunchpads == 0)
		},
		getCopyOfThisPlanet: function(){
			//console.log("Inside Planet.getCopyOfThisPlanet");
			var newPlanet = new Planet();
			angular.forEach(this.factoriesBasic, function(factory){
				newPlanet.factoriesBasic.push({schematic:factory.schematic, number:factory.number, avgActiveCycles: factory.avgActiveCycles});
			})
			angular.forEach(this.factoriesAdvanced, function(factory){
				newPlanet.factoriesAdvanced.push({schematic:factory.schematic, number:factory.number, avgActiveCycles: factory.avgActiveCycles});
			})
			angular.forEach(this.factoriesHightech, function(factory){
				newPlanet.factoriesHightech.push({schematic:factory.schematic, number:factory.number, avgActiveCycles: factory.avgActiveCycles});
			})
			angular.forEach(this.extractors, function(e){
				newPlanet.extractors.push({resourceId: e.resourceId, headcount: e.headcount, yieldPerHour: e.yieldPerHour});
			})
			newPlanet.name = this.name + " copy";
			newPlanet.numStorage = this.numStorage;
			newPlanet.numLaunchpads = this.numLaunchpads;
			newPlanet.useCCStorage = this.useCCStorage;
			newPlanet.restrictPads = this.restrictPads;
			newPlanet.taxRate = this.taxRate;
			newPlanet.level = this.level;
			newPlanet.avgLinkLength = this.avgLinkLength;
			newPlanet.cyclesPerActiveCycle = this.cyclesPerActiveCycle;
			newPlanet.isFactoryPlanet = this.isFactoryPlanet;

			newPlanet.refreshStorage(); //includes fitting
			newPlanet.refreshImportExports();
			newPlanet.refreshAllowedPlanets();

			return newPlanet;
		}

	};

	return Planet;
}])
