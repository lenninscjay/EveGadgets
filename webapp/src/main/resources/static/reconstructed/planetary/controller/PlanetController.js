var app = angular.module('PlanetaryGadget', ['PlanetCoordinator', 'PlanetData', 'ui.bootstrap', 'MarketConstants', 'ngRoute']);

app.controller('planetAppController', ['$scope', 'PlanetLogic', 'DATA', 'LEVEL', 'PRODUCT', 'PLANETNAME', 'MARKET_IDS', '$routeParams',
                                       function($scope, PlanetLogic, DATA, LEVEL, PRODUCT, PLANETNAME, MARKET_IDS, $routeParams){


	$scope.utilizationMessage =
		'<p>A setup with imports needs to be able to "catch up" or will be stuck with intermediate product forever.</p>'
		+ '<p>Checking this enables boxes which can set factories or the planet to be active only every X cycles.</p>'
		+ '<p>For example, setting the planet to 2 would create a planet active 50% of the time (once every 2 cycles)</p>';

	$scope.activeView = 'HELP'
	$scope.setActiveView = function(view){
		console.log("changing active view: " + view);
		$scope.activeView = view;
	}
	$scope.LEVEL = LEVEL.LEVEL;

	$scope.worldSeed = "The world of worlds. Planets!";

	//Note: unlike other factories and services, the controller gets DATA from conf.js through resolve
	$scope.DATA = DATA;
	$scope.COST = PRODUCT.TIER_COST;
	$scope.PLANETNAME = PLANETNAME;

	$scope.Logic = PlanetLogic;
	$scope.addPlanet = function(){
		$scope.activeView = PlanetLogic.addPlanet();
	};

	$scope.deletePlanet = function(p){
		var newIndex = PlanetLogic.deletePlanet(p);
		if(newIndex >= 0){
			$scope.activeView = newIndex;
		} else {
			$scope.activeView = 'HELP';
		}
	}

	$scope.MARKETS = MARKET_IDS;


	$scope.baseUrl = window.location.origin + window.location.pathname + "#/"; //unsafe?
	// $scope.baseUrl = "http://www.eveGadgets.com/#/pi/";
	$scope.saveKey = '';

	$scope.baseMenu.save = function(){
		$scope.saveKey = '';
		var promise = $scope.Logic.saveSetup();
		promise.then(function(successVal){
				$scope.activeView = "SAVE";
				$scope.saveKey = successVal;
			}, function(failReason){
				$scope.activeView = "SAVE";
				//saveKey should remain falsy
			});
	}

	// $scope.baseMenu.load = function(){}

	/**
	 * On load
	 */
	if($routeParams.loadId){
		PlanetLogic.loadSetup($routeParams.loadId);
	}
	//What is best in Angular?
	//to define all actions in the controller
	//to pass through actions directly
	//or hear the lamentations of competent webdevs?




}])
