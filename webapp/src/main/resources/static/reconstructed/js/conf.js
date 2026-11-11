var app = angular.module('gadgets', ['ngRoute','PlanetaryGadget','PlanetData']);

var planetaryRoute = {
			appName : "PI Planning Made Simple",
			templateUrl : '/reconstructed/planetary/piGadgetIndex.html',
			controller : 'planetAppController',
			resolve: {
				'DATA' : function(PiDataService, PiDataModel){
					return PiDataService.getData().then(function(data){
//						console.log("Resolved data, setting in PiDataModel: " + angular.toJson(data));
						PiDataModel.setData(data);
						return PiDataModel.getData();
	})	}	}	}


app.config(['$routeProvider', function($routeProvider, PiDataService, PiDataModel) {
	$routeProvider.
		when('/', planetaryRoute).
		when('/:loadId', planetaryRoute). //populates $routeParams, otherwise identical
//		when('/scrap', {
//			appName : "Scrap for Everyone! But mostly you",
//			templateUrl : 'scrap/scrapGadgetIndex.html',
//			controller : 'scrapAppController'
//		}).
		otherwise({
			appName : "Whoops",
			redirectTo : '/'
		});
}]);

app.run(['$rootScope', function($rootScope){
	$rootScope.$on('$routeChangeError', function(){ $rootScope.routeError = 'Could not load PI data. Check the local server/database and reload.'; });
	$rootScope.$on('$routeChangeSuccess', function(event, current, previous) {
        $rootScope.routeError = '';
		if(current.$$route) $rootScope.appName = current.$$route.appName
		else $rootScope.appName = "Gadgets";
	})
}]);

app.controller('baseController', ['$scope',
       function($scope){

       	$scope.baseMenu = {};
       	//undefined save method for child interface


       	// alternate approach, ignoring for now
       	// $scope.saveEvent = function(){
       	// 	$scope.$broadcast('savePing');
       	// 	return $scope.msg;
       	// }

       	// $scope.$on ('savePingResponse', function(e,data){
       	// 	$scope.msg = data;
       	// })
}]);
