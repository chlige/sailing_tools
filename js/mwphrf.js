/*
 * Script to parse data from MWPHRF's website
 *
 */

MWPHRF_SEARCH_URL = "https://mwphrf.org/index.php/display-a-handicap";
MWPHRF_CSV_URL = "https://mwphrf.org/index.php/handicapping/region-9-export-export-csv"

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
