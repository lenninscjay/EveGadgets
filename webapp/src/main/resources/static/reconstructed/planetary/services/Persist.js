// The compact schema is shared with the classic planner and its MySQL saves.
angular.module('persistservice', ['PlanetModel']).service('persistHandler', ['$http', '$q', 'Planet', 'PiDataModel', function($http, $q, Planet, PiDataModel){
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
    function number(v, min, max, label, integer){
        if (typeof v !== 'number' || !isFinite(v) || v < min || v > max || (integer && Math.floor(v) !== v))
            throw new Error('Invalid ' + label + '.');
    }
    function validate(data){
        if (!data || typeof data !== 'object' || !Array.isArray(data.pl) || !data.pl.length || data.pl.length > 1000)
            throw new Error('Setup must contain between 1 and 1,000 planets.');
        var details = PiDataModel.getData().itemDetails;
        var recipes = PiDataModel.getData().schematicMap;
        ['is','es'].forEach(function(k){if(data[k]) number(+data[k],1,2147483647,'market location',true);});
        ['ib','eb','it','et'].forEach(function(k){if(data[k] != null) number(data[k],0,100,'tax or broker fee');});
        ['io','eo'].forEach(function(k){if(data[k] != null && ['buy','sell'].indexOf(data[k]) < 0) throw new Error('Invalid order side.');});
        data.pl.forEach(function(p){
            if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Invalid planet.');
            if (p.x != null && typeof p.x !== 'string') throw new Error('Planet name must be text.');
            ['c','r','f'].forEach(function(k){if(p[k] != null && typeof p[k] !== 'boolean') throw new Error('Invalid planet option.');});
            ['s','p','n'].forEach(function(k){if(p[k] != null) number(p[k],0,1000000,'facility count or link length',true);});
            if(p.t != null) number(p.t,0,100,'planet tax');
            if(p.l != null) number(p.l,0,5,'command center level',true);
            if(p.v != null) number(p.v,1,1000000,'planet cycle interval');
            ['b','a','h','e'].forEach(function(k){
                if(p[k] == null) return;
                if(!Array.isArray(p[k]) || p[k].length > 10000) throw new Error('Invalid facility list.');
                p[k].forEach(function(f){
                    if(!f || typeof f !== 'object') throw new Error('Invalid facility.');
                    var id = k === 'e' ? f.r : f.s;
                    if(id){
                        var item = Object.prototype.hasOwnProperty.call(details,id) && details[id];
                        var allowed = {e:[0],b:[1],a:[2,3],h:[4]}[k];
                        if(!item || allowed.indexOf(item.tier) < 0 || (k !== 'e' && !Object.prototype.hasOwnProperty.call(recipes,id)))
                            throw new Error('Unknown commodity or wrong factory tier: ' + id);
                    }
                    if(k === 'e'){if(f.h != null) number(f.h,0,10,'extractor head count',true);}
                    else {
                        if(f.n != null) number(f.n,0,1000000,'factory count',true);
                        if(f.a != null) number(f.a,1,1000000,'factory cycle interval');
                    }
                });
            });
        });
    }
    function decode(data){
        validate(data);
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
