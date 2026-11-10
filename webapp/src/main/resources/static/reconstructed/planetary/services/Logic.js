var app = angular.module('PlanetCoordinator', ['PlanetModel','PlanetData', 'marketservice', 'persistservice'])

app.factory('PlanetLogic',['$http', '$q', 'Planet', 'PiDataModel', 'MarketDataService', 'persistHandler',
                          function($http, $q, Planet, Data, MarketService, PersistHandler){

	function arrayObjectIndexOf(array, term, property){
		for(var i = 0; i < array.length; i++){
			if(array[i][property] == term) return i;
		}
		return -1;
	}


	var service = {};
	service.planets = [];

	var data = Data.getData();
	var len = 0;
	// var planetList = [];

	var basicTypeList = function() {
		//console.log("Inside Logic.basicTypeList")
		var typeList = [];
		angular.forEach(data.itemDetails, function(det, id){
			if(det.tier == 1){
				typeList.push({id: id, name: det.name})
			}
		});
		// console.log("basic type list: " + typeList);
		return typeList;
	}

	var advancedTypeList = function() {
		//console.log("Inside Logic.advancedTypeList")
		var typeList = [];
		angular.forEach(data.itemDetails, function(det, id){
			if(det.tier == 2 || det.tier == 3){
				typeList.push({id: id, name: det.name})
			}
		});
		return typeList;
	}

	var hightechTypeList = function() {
		//console.log("Inside Logic.hightechTypeList");
		var typeList = [];
		angular.forEach(data.itemDetails, function(det, id){
			if(det.tier == 4){
				typeList.push({id: id, name: det.name})
			}
		});
		return typeList;
	}

	function getSystemImportExports() {
		//console.log("Inside Logic.getSystemImportExports");
		var ioList = [];
		angular.forEach(service.planets, function(planet){
//			planet.ioDetails {id, quantity}
			angular.forEach(planet.ioDetails, function(io){
				var index = arrayObjectIndexOf(ioList, io.id, "id");
				if(io.quantity != 0){
					if(index == -1){
						ioList.push({id: io.id, quantity: io.quantity / planet.cyclesPerActiveCycle});
					}
					else {
						ioList[index].quantity += io.quantity / planet.cyclesPerActiveCycle;
					}
				}
			})
		})
		ioList.sort(function(a,b){return a.quantity - b.quantity})
		return ioList;
	}

	function getSystemTaxes() {
		//console.log("Inside Logic.refreshTotalTaxes");
		var taxes = {importTaxes: 0, exportTaxes: 0};
		angular.forEach(service.planets, function(planet){
			taxes.importTaxes += planet.importTaxes / planet.cyclesPerActiveCycle;
			taxes.exportTaxes += planet.exportTaxes / planet.cyclesPerActiveCycle;
		})
		return taxes;
	}

	function getSystemRuntime() {
		//console.log("Inside Logic.refreshSystemRuntime");
		var runtimeInfo = {bottleneck:'', minRuntime: 999999};
		angular.forEach(service.planets, function(planet){
			if(planet.runtime > 0 &&
					planet.runtime < runtimeInfo.minRuntime &&
					planet.cyclesPerActiveCycle == 1){
				runtimeInfo.bottleneck = planet.name;
				runtimeInfo.minRuntime = planet.runtime;
			}
		})
		if(runtimeInfo.minRuntime == 999999){
			runtimeInfo.bottleneck = 'N/A';
			runtimeInfo.minRuntime = 0;
		}
		return runtimeInfo;
	}

	function getSystemSetupCost() {
		//console.log("Inside Logic.refreshSystemSetupCost");
		var totalCost = 0;
		angular.forEach(service.planets, function(planet){
			totalCost += planet.Cost;
		})
		return totalCost;
	}





	service.addPlanet = function() {
		//console.log("Inside Logic.addPlanet");
		len = len + 1;
		var p = new Planet("Planet " + len);
		service.planets.push(p);
		return service.planets.length-1;
	}
	service.createPlanetFromCopy = function(p) {
		//console.log("Inside Logic.createPlanetFromCopy with ars: " + angular.toJson(p))
		var newPlanet = p.getCopyOfThisPlanet();
		len = len + 1;
		service.planets.push(newPlanet);
	}
	service.deletePlanet = function(p){
		var index = service.planets.indexOf(p);
		service.planets.splice(index, 1);
		return index-1;
	}

	service.System = {};
	service.System.importExports = [];
	service.System.taxes = {};
	service.System.taxes.importTaxes = 0;
	service.System.taxes.exportTaxes = 0;
	service.System.runtimeInfo = {}
	service.System.runtimeInfo.bottleneck = '';
	service.System.runtimeInfo.minRuntime = 0;
	service.System.setupCost = 0;

	service.loadOverviewTab = function(){
		service.System.importExports = getSystemImportExports();

		var taxes = getSystemTaxes();
		service.System.taxes.importTaxes = taxes.importTaxes;
		service.System.taxes.exportTaxes = taxes.exportTaxes;

		var runtimeInfo = getSystemRuntime();
		service.System.runtimeInfo.bottleneck = runtimeInfo.bottleneck;
		service.System.runtimeInfo.minRuntime = runtimeInfo.minRuntime;

		service.System.setupCost = getSystemSetupCost();
	}

	service.loadMarketDetailsTab = function(){
		//console.log("Inside Logic, loadMarketDetailsTab")
		service.loadOverviewTab();
		service.getMarketInfo();
	}

	service.refreshSystemMarketTotals = function(){
        if (!service.pricesReady) return;
		//Total hourly export revenue
		//Total hourly import cost
		//Total hourly customs tax
		//per planet:
		//	total hourly export revenue
		//	total hourly import cost
		var totalHourlyExportRevenue = 0;
		var totalHourlyImportCost = 0;
		var totalHourlyCustomsTax = 0;
		angular.forEach(service.planets, function(planet){
			planet.exportRevenue = 0;
			planet.importCost = 0;
			angular.forEach(planet.ioDetails, function(io){
				//console.log("Inside refreshSystemMarketTotals: ", angular.toJson(io));
				if(io.quantity > 0){
					planet.exportRevenue += this.marketprices[io.id][this.exportMarketId][this.exportOrderType][this.exportStatistic] * io.quantity
				} else if (io.quantity < 0) {
					planet.importCost -= this.marketprices[io.id][this.marketId][this.importOrderType][this.importStatistic] * io.quantity
				}
			},this)
			// totalHourlyExportRevenue += planet.exportRevenue / planet.cyclesPerActiveCycle;
			// totalHourlyImportCost += planet.importCost / planet.cyclesPerActiveCycle;
			totalHourlyCustomsTax += (planet.exportTaxes + planet.importTaxes) / planet.cyclesPerActiveCycle;
		},this)
		angular.forEach(service.System.importExports, function(io){
			//Only update import and export costs for complete setup, not both imports and exports
			if(io.quantity > 0){
				totalHourlyExportRevenue +=
					this.marketprices[io.id][this.exportMarketId][this.exportOrderType][this.exportStatistic] * io.quantity;
			} else if (io.quantity < 0){
				totalHourlyImportCost -=
					this.marketprices[io.id][this.marketId][this.importOrderType][this.importStatistic] * io.quantity;
			}
		}, this)
		console.log("After refreshSystemMarketTotals: ", totalHourlyExportRevenue, totalHourlyImportCost, totalHourlyCustomsTax);
		this.totalHourlyExportRevenue = totalHourlyExportRevenue;
		this.totalHourlyImportCost = totalHourlyImportCost;
		this.totalHourlyCustomsTax = totalHourlyCustomsTax;
		//update market fees
		this.refreshMarketFees();
	}

	service.refreshMarketFees = function(){
		//console.log("Inside Logic's refreshMarketFees");
		//exports have sales tax. Imports do not.
		//exports with SELL orders have broker fees. Imports with BUY orders have broker fees.
		if(this.importOrderType == "buy"){
			//obtain import materials with buy orders: broker fees
			this.totalHourlyImportMarketFees = this.totalHourlyImportCost * this.importBrokerFees/100;
		} else{
			//obtain import materials with sell orders: nothing
			this.totalHourlyImportMarketFees = 0;
		}
		if(this.exportOrderType == "sell"){
			//liquidate by creating sell orders: sales tax and broker fees
			this.totalHourlyExportMarketFees = this.totalHourlyExportRevenue * (this.taxRate + this.exportBrokerFees)/100
		} else {
			//liquidate by consuming buy orders: sales tax
			this.totalHourlyExportMarketFees = this.totalHourlyExportRevenue * this.taxRate/100;
		}
		angular.forEach(service.planets, function(planet){
			if(this.importOrderType == "buy"){
				planet.importMarketFees = planet.importCost * this.importBrokerFees/100;
			} else{
				planet.importMarketFees = 0;
			}
			if(this.exportOrderType == "sell"){
				planet.exportMarketFees = planet.exportRevenue * (this.taxRate + this.exportBrokerFees)/100
			} else {
				planet.exportMarketFees = planet.exportRevenue * this.taxRate/100;
			}
		},this)
		// console.log("market fees? ", this.importOrderType, this.exportOrderType, this.taxRate, this.brokerFees, this.totalHourlyImportMarketFees, this.totalHourlyExportMarketFees)
	}

	this.totalHourlyCustomsTax = 0;
	this.totalHourlyImportCost = 0;
	this.totalHourlyExportRevenue = 0;
	this.totalHourlyImportMarketFees = 0;
	this.totalHourlyExportMarketFees = 0;

	service.marketId = "10000002"; //jita
	service.taxRate = 12/10;
	service.exportBrokerFees = 3;
	service.importBrokerFees = 3/10;
	service.importOrderType = "buy";
	service.exportOrderType = "sell";
	service.marketprices = {};

	service.marketCallOngoing = false;

    var requestVersion = 0;
    service.pricesReady = false;
    service.marketError = '';
    service.exportMarketId = service.marketId;
    service.importStatistic = service.exportStatistic = 'percentile';
    service.statistics = ['percentile','wavg','median','min','max'];
    service.getMarketInfo = function(){
        var version = ++requestVersion;
        service.loadOverviewTab();
        service.marketCallOngoing = true;
        service.pricesReady = false;
        service.marketError = '';
        // Include intermediate goods even if their net system flow cancels out.
        var ids = {};
        angular.forEach(service.planets,function(p){
            angular.forEach(p.ioDetails,function(io){if(io.quantity) ids[io.id] = true;});
        });
        var markets = [service.marketId];
        if (service.exportMarketId !== service.marketId) markets.push(service.exportMarketId);
        return MarketService.getMarketInfo(markets,Object.keys(ids)).then(function(prices){
            if (version !== requestVersion) return;
            service.marketprices = prices;
            service.pricesReady = true;
            service.refreshSystemMarketTotals();
            service.marketCallOngoing = false;
        },function(){
            if (version !== requestVersion) return;
            service.marketprices = {};
            service.marketError = 'Prices unavailable. Cached data may be incomplete, or the provider may be cooling down. Retry later.';
            service.marketCallOngoing = false;
        });
    };
    service.saveSetup = function(){return PersistHandler.saveSetup(service);};
    service.loadSetup = function(key){
        service.failedLoad = false;
        return PersistHandler.loadSetup(key).then(function(saved){
            angular.forEach(saved,function(v,k){service[k] = v;});
            len = service.planets.length;
            service.loadedSetup = true;
            return service.getMarketInfo();
        },function(){service.failedLoad = true;});
    };
    // Only a cache warm-up: on expiry the next user action refreshes the batch.
    MarketService.warm(service.marketId).then(function(){},function(){
        service.marketError = 'Market cache could not be warmed; pricing will retry when needed.';
    });

	service.data = data;
	// service.planets = planetList;
	service.basicTypeList = basicTypeList();
	service.advancedTypeList = advancedTypeList();
	service.hightechTypeList = hightechTypeList();

	return service;

}])
