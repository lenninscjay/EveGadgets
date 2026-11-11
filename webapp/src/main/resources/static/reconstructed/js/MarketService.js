// All provider access stays behind the shared, persistent server cache.
angular.module('marketservice', []).service('MarketDataService', ['$http', '$q', function($http, $q){
    return {
        warm: function(market){return $http.get('/priceAPI/warm', {params:{system:market}});},
        getMarketInfo: function(markets, types){
            if (!types.length) return $q.when({});
            return $http.get('/priceAPI', {params:{system:markets.join(','), type:types.join(',')}})
                .then(function(response){return response.data;});
        }
    };
}]);
