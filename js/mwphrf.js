/*
 * Script to parse data from MWPHRF's website
 *
 */

// MWPHRF_SEARCH_URL = "https://mwphrf.org/index.php/display-a-handicap";
// MWPHRF_CSV_URL = "https://mwphrf.org/index.php/handicapping/region-9-export-export-csv"
MWPHRF_SEARCH_URL = "https://dev.railmeets.com/api/v1/phrf/certificates"

const MWPHRF_QUERY_TYPES = {
	SAIL_NUMBER: '',
	BOAT_NAME: 'name',
	MAKE_MODEL: 'model'
}

class MapSet extends Map {

	constructor(...args) {
		super();
		for ( const elem of args ) { 
			if ( !this.has(elem) ) this.add(elem);
		}
	}

	add(elem) { 
		return ( ! this.has(elem) ) ? this.set(JSON.stringify(elem), elem) : this;
	}

	has(elem) {
		if (typeof elem !== 'object') return super.has(elem);
		return super.has(JSON.stringify(elem));
	}

	delete(elem) { 
		if (typeof elem !== 'object') return super.delete(elem);
		return super.delete(JSON.stringify(elem));
	}

}

/* Original code for scraping from MWPHRF website
function searchMWPHRF(queryType, queryValue, callback, exactMatch=false) { 
	$.ajax({
		url: MWPHRF_SEARCH_URL,
		type: "GET",
		data: {
		   "searchType": queryType,
                   "searchvalue": queryValue,
		   "submit": "submit"
		},
		success: function (data, status, http) {
			if ( http.status==200 ) {
				parseMWPHRFTable(data, callback);
			}
		},
		error: function (http, status, error) {
			alert(status);
		}
	});
}
*/

// Version using the Railmeets bridge
function searchMWPHRF(queryType, queryValue, callback, exactMatch=false) { 
	const query_params = { 'q': queryValue };

	if ( queryType != "" ) { query_params['by'] = queryType; }

	$.ajax({
		url: MWPHRF_SEARCH_URL,
		type: "GET",
		data: query_params,
		success: function (data, status, http) {
			if ( http.status==200 ) {
				let results = data.results;
				if ( exactMatch ) {
					switch (queryType) {
						case '':
						case 'sail':
							results = results.filter((item) => item.sailNo === queryValue);
							break;
						case 'name':
							results = results.filter((item) => item.yachtName === queryValue);
							break;
						case 'type':
							results = results.filter((item) => item.makeModel === queryValue);
							break;

					}
				}
				callback(results);	
			}
		},
		error: function (http, status, error) {
			alert(status);
		}
	});
}

function parseMWPHRFTable(data, callback) {
	console.log(data);
}

function getMWPHRFRegion(region, callback) {
	$.ajax({
		url: MWPHRF_CSV_URL,
		type: "GET",
		data: {
		   "region": region,
		},
		success: function (data, status, http) {
			if ( http.status==200 ) {
				parseMWPHRFCSV(data, callback);
			}
		},
		error: function (http, status, error) {
			alert(status);
		}
	});
}

function parseMWPHRFCSV(data, callback) {
	console.log(data);
}

class PHRFBoat {
  constructor(yachtName, sailNumber, makeModel) {
    this.yachtName = yachtName;
    this.sailNumber = sailNumber;
    this.makeModel = makeModel;
    this.certificates = [];
  }
}

class PHRFCertificate {
  constructor(year, url) {
    this.year = year;
    this.url = url;
    this.values = {};
  }
}
