// The compact schema is shared with the classic planner and its MySQL saves.
angular.module('persistservice', ['PlanetModel']).service('persistHandler', ['$http', '$q', 'Planet', function($http, $q, Planet){
    function value(v, fallback){return v === null || v === undefined ? fallback : v;}
    function statistic(s){
        if (s === 'avg') return 'wavg';
        return ['min','max','median','wavg','percentile'].indexOf(s) >= 0 ? s : 'percentile';
    }
    var fields = {s:'numStorage', p:'numLaunchpads', c:'useCCStorage', r:'restrictPads',
        t:'taxRate', l:'level', n:'avgLinkLength', v:'cyclesPerActiveCycle', f:'isFactoryPlanet', x:'name'};
    var defaults = {s:0,p:0,c:false,r:false,t:10,l:0,n:200,v:1,f:false,x:'Planet'};
    function encode(logic){
        return {is:+logic.marketId, es:+logic.exportMarketId, io:logic.importOrderType, eo:logic.exportOrderType,
            im:logic.importStatistic, em:logic.exportStatistic, ib:logic.importBrokerFees, eb:logic.exportBrokerFees,
            it:logic.taxRate, et:logic.taxRate, pl:logic.planets.map(function(p){
                var out = {};
                angular.forEach(fields, function(name, key){out[key] = p[name];});
                angular.forEach({b:'factoriesBasic',a:'factoriesAdvanced',h:'factoriesHightech'}, function(name,key){
                    out[key] = p[name].map(function(f){return {s:+f.schematic || null,n:f.number,a:f.avgActiveCycles};});
                });
                out.e = p.extractors.map(function(e){return {r:+e.resourceId || null,h:e.headcount};});
                return out;
            })};
    }
    function decode(data){
        if (!data || !Array.isArray(data.pl) || !data.pl.length) throw new Error('Saved setup was not found');
        return {marketId:String(data.is || 10000002),exportMarketId:String(data.es || 10000002),
            importOrderType:data.io || 'buy',exportOrderType:data.eo || 'buy',
            importStatistic:statistic(data.im),exportStatistic:statistic(data.em || data.ex),
            importBrokerFees:value(data.ib,1),exportBrokerFees:value(data.eb,1),taxRate:value(data.et,1.5),
            planets:data.pl.map(function(saved){
                var p = new Planet();
                angular.forEach(fields,function(name,key){p[name] = value(saved[key],defaults[key]);});
                angular.forEach({b:'factoriesBasic',a:'factoriesAdvanced',h:'factoriesHightech'},function(name,key){
                    p[name] = (saved[key] || []).map(function(f){return {schematic:f.s ? String(f.s) : '',
                        number:value(f.n,1),avgActiveCycles:value(f.a,1)};});
                });
                p.extractors = (saved.e || []).map(function(e){return {resourceId:value(e.r,0),headcount:value(e.h,0)};});
                p.refreshStorage();p.refreshImportExports();p.refreshAllowedPlanets();
                return p;
            })};
    }
    return {encode:encode,decode:decode,
        saveSetup:function(logic){
            return $http.post('/persist/saveSetup',encode(logic)).then(function(response){
                if (response.data.KEY === undefined) return $q.reject('Save failed');
                return response.data.KEY;
            });
        },
        loadSetup:function(key){
            return $http.get('/persist/getSetupByGet',{params:{id:key}}).then(function(response){
                try { return decode(response.data.setup); }
                catch (error) { return $q.reject(error.message); }
            });
        }
    };
}]);
