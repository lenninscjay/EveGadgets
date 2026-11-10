app.directive('egFactoryManager',['PiDataModel', function (DATA) {
    return {
        restrict: 'E',

        templateUrl: 'planetary/partials/factoryTemplate.html',

        replace: true,

        scope:{
        	factory: '=',
        	factoryList: '=',
        	p: "=",
        	typeList: "=",
        	deleteThisFactory: "&"
        },
        controller: ['$scope', 'PiDataModel', function($scope, DATA){
        	$scope.DETAILS = DATA.getData().itemDetails;
        	$scope.Name = function(id) {return DATA.getData().itemDetails[id].name};
        	$scope.removeThis = function(){
        		$scope.deleteThisFactory({f: $scope.factory});
        	};

        }]
    };

}]);
