var app = angular.module('PlanetData', [])

/*app.constant('DATA', function($http){
	$http.get("planetary/planetDetails").success(function(value){
		console.log("well at least this shit works")
		return value;
	});
})*/

app.constant("FACILITIES", {
	E_CONTROL:{CPU:400,GRID:2600,COST:45000},
	E_HEAD:{CPU:110, GRID:550,COST:0},
	BASIC_FACTORY:{CPU:200,GRID:800,COST:75000},
	ADVANCED_FACTORY:{CPU:500,GRID:700,COST:250000},
	HIGHTECH_FACTORY:{CPU:1100,GRID:400,COST:525000},
	STORAGE:{CPU:500, GRID:700, COST:250000},
	LAUNCHPAD:{CPU:3600, GRID:700, COST:900000},
	LINK:{CPU:0.1539, GRID:0.1575, COST:0}
});

app.constant("PRODUCT",{
	TIER_COST:[4,400,7200,60000,1200000],
	TIER_VOLUME:[0.005, 0.19, 0.75, 3, 50]
})

app.constant("LEVEL",{
	LEVEL:[{CPU:1675, GRID:6000, COST:0},
	       {CPU:7057, GRID:9000, COST:580000},
	       {CPU:12136, GRID:12000, COST:1510000},
	       {CPU:17215, GRID:15000, COST:2710000},
	       {CPU:21315, GRID:17000, COST:4210000},
	       {CPU:25415, GRID:19000, COST:6310000}]
})

app.constant("PLANETNAME", {
	11: "Temp",
	12: "Ice",
	13: "Gas",
	2014: "Ocean",
	2015: "Lava",
	2016: "Barren",
	2017: "Storm",
	2063: "Plasma"
})

// Adapt the current server dataset, never the archived snapshot.
app.service('PiDataService', ['$http', function($http){
    return {getData: function(){
        return $http.get('/planetary').then(function(response){
            var raw = response.data;
            var data = {itemDetails: raw.itemDetails, schematicMap: {}, planetMap: {}, resourceMap: {}};
            angular.forEach(raw.schematicMap, function(s, id){
                data.schematicMap[id] = {outputID: s.outputID, quantity: s.outputQuantity,
                    cycleTime: s.cycleTime, recipe: s.recipe.map(function(c){
                        return {typeid: c.typeId, quantity: c.quantity};
                    })};
            });
            angular.forEach(raw.planetMap, function(p, id){data.planetMap[id] = p.resourceIDs;});
            angular.forEach(raw.resourceMap, function(r, id){data.resourceMap[id] = r.planetIDs;});
            return data;
        });
    }};
}]);

app.service('PiDataModel', [function(){
	var data;

	return{
		setData: function(resolved){
	//		console.log("Successfully setting data in PiDataModel: " + angular.toJson(resolved));
			this.data = resolved;
		},
		getData: function(){
//			console.log("Retrieving data from PiDataModel: " + angular.toJson(this.data));
			return {
				planetMap: this.data.planetMap,
				resourceMap: this.data.resourceMap,
				schematicMap: this.data.schematicMap,
				itemDetails: this.data.itemDetails
			}
		}
//		planetMap: this.data.planetMap,
//		resourceMap: this.data.resourceMap,
//		schematicMap: this.data.schematicMap,
//		itemDetails: this.data.itemDetails

	/*,
		getData: function(){
//			console.log("Retrieving data from PiDataModel: " + angular.toJson(this.data));
			return this.data;
		}*/
	}

}]);
