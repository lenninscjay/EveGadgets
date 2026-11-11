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

    $scope.backup = {text:'', error:'', message:''};
    $scope.baseMenu.backup = function(){ $scope.activeView = 'BACKUP'; };
    $scope.exportJson = function(){
        $scope.backup.error = '';
        try {
            $scope.backup.text = PlanetLogic.exportJson();
            $scope.backup.message = 'Current setup exported. Copy the JSON or download a file.';
            return true;
        } catch(error) { $scope.backup.message = ''; $scope.backup.error = error.message; return false; }
    };
    $scope.downloadJson = function(){
        if (!$scope.exportJson()) return;
        var url = window.URL.createObjectURL(new Blob([$scope.backup.text], {type:'application/json'}));
        var link = document.createElement('a');
        link.href = url; link.download = 'evegadgets-setup.json';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.setTimeout(function(){window.URL.revokeObjectURL(url);},1000);
    };
    $scope.importJson = function(){
        $scope.backup.error = ''; $scope.backup.message = '';
        try {
            PlanetLogic.importJson($scope.backup.text);
            $scope.saveKey = '';
            $scope.backup.message = 'Setup imported. Open Setup Overview to review it.';
        } catch(error) { $scope.backup.error = error.message; }
    };
    var fileReadVersion = 0;
    $scope.readSetupFile = function(file){
        var version = ++fileReadVersion;
        if (!file) return;
        $scope.backup.error = ''; $scope.backup.message = '';
        if (file.size > 2 * 1024 * 1024) { $scope.backup.error = 'Setup file must be under 2 MB.'; return; }
        var reader = new FileReader();
        reader.onload = function(){ $scope.$applyAsync(function(){
            if (version !== fileReadVersion) return;
            $scope.backup.text = reader.result;
            $scope.backup.message = 'File opened. Select Replace setup from JSON to import it.';
        }); };
        reader.onerror = function(){ $scope.$applyAsync(function(){
            if (version === fileReadVersion) $scope.backup.error = 'Could not read the setup file.';
        }); };
        reader.readAsText(file);
    };

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

// AngularJS does not bind file inputs with ng-model.
app.directive('egSetupFile', function(){
    return {restrict:'A', link:function(scope, element, attrs){
        function changed(){scope.$apply(function(){scope.$eval(attrs.egSetupFile,{file:element[0].files[0]});});}
        element.on('change',changed);
        scope.$on('$destroy',function(){element.off('change',changed);});
    }};
});
