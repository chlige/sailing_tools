// Base function to passThrough the value
function pass(object) {
	return object;
}

// Base class for all events (Regatta)
class Regatta {
	constructor(event_id, name, start_date=undefined, end_date=undefined, oa="", details={}) {
		this.id = event_id;
		this.name = name;
		this.start_date = start_date;
		this.end_date = end_date;
		this.oa = oa;
		this.details = details;
	}
}

// Base class for registered entries
class Entry { 

	constructor(event, entry_id="", sail_number="", 
		name="", design="", owners_name="", 
		racing_circle="", racing_division="", racing_class="", details={}) {

		this.event = event;
		this.id = entry_id;
		this.sail_number = sail_number;
		this.name = name;
		this.design = design;
		this.owners_name = owners_name;
		this.racing_circle = racing_circle;
		this.racing_division = racing_division;
		this.racing_class = racing_class;
		this.details = details;
	}
}

// Base class for a race, used by Result class
class Race {
	constructor(event, race_number, distance, details={}) {
		this.event = event;
		this.race_number = race_number;
		this.distance = distance;
		this.details = details;
	}
}

// Base class for a result
class Result {

	constructor(entry, race, result_id, elapsed_time, corrected_time, points, status, detail={}) {
		this.entry = entry;
		this.race = race;
		this.result_id = result_id;
		this.elapsed_time = elapsed_time;
		this.corrected_time = corrected_time;
		this.points = points;
		this.status = status;
		this.detail = detail;
	}
}

class YSEvent extends Regatta {

	constructor(data) { 
		super(data.id, data.name, new Date(data.startDate), new Date(data.endDate), 
			(data.hostClub != undefined ? data.hostClub.name : ""), data);
		this.race_map = {};
	}

	// Function to get events from YachtScoring
	static search(query, page=1, callback_fn=pass) {
		$.ajax({
			url: "https://api.yachtscoring.com/v1/public/event",
			type: "GET",
			data: { 
			    "sort": "startDate.desc",
	                   "or_name_contains": query,
	                   "or_hostClub.name_contains": query,
	                   "authorizedOnly": "false",
	                   "page": page,
	                   "size": 100,
	                   "isActive_eq": "true"
			},
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(data.rows.map((d) => new YSEvent(d)));
					if ( data.count > ( page * 100 ) )
						YSEvent.search(query, page + 1, callback_fn);
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	// function to get a list of entries and return via a callback function
	getEntries(callback_fn=pass) {
		let parent_event = this;
		$.ajax({
			url: "https://api.yachtscoring.com/v1/public/event/" + this.id + "/scratch-sheet",
			type: "GET",
			data: { 
			   "sort": "split.splitCircle.asc,split.startSequence.asc,split.splitDivision.asc,split.splitClass.asc,name.asc,id.asc",
				"includeSubclass": "false",
				"divisionGrouping": "true"
			},
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(YSEntry.parse(data, parent_event));
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	// Function to load the registered entries (boats) for a YS event
	getResults(callback_fn=pass) {
		let parent_event = this;
		$.ajax({
			// url: "https://api.yachtscoring.com/v1/public/event-races",
			url: "https://api.yachtscoring.com/v1/public/event/" + parent_event.id + "/races",
			type: "GET",
			data: { 
			  // "eventId": event_id,
			  // "hasResult": true
			  "size": 1000,
			  "page": 1,
			},
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					parent_event.parseRaceMap(data.rows);
					parent_event.loadAllResults(callback_fn);
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	parseRaceMap(rows) {
		for ( const r of rows ) { 
			if ( !(r.raceNumber in this.race_map) ) 
				this.race_map[r.raceNumber] = {};
			this.race_map[r.raceNumber][r.split.splitClass] = new YSRace(this, r);
		}
	}
	
	// Function to load the results for a race
	loadAllResults(callback_fn=pass) { 
		for ( const r in this.race_map ) { 
			this.loadRaceResults(r, callback_fn);	
		}
	}

	loadRaceResults(race, callback_fn=pass) { 
		let parent_event = this;
		$.ajax({
			url: "https://api.yachtscoring.com/v1/public/event/" + this.id + "/result-detail-report",
			type: "GET",
			data: { 
			   "raceNumber": race
			},
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(parent_event.parseResults(data, race));
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	parseResults(data, raceNumber) {
		let allEntries = [];
		for ( const this_circle of data.data ) { 
		  	for ( const this_div of this_circle.divisions ) { 
				for ( const this_section of this_div.classes ) { 
					for ( const boat of this_section.boats ) { 
						let race = this.race_map[raceNumber][this_section.class];
						let boatRes = new YSResult( new Entry(this, boat.eventBoatId, boat.sailNumber, 
								boat.name, boat.design, boat.owner.firstName + " " + boat.owner.lastName,
								this_circle.circleName, this_div.divisionName, this_section.className),
							race, boat);
						allEntries.push(boatRes);
					}
				}
			}
		}
		return allEntries;
	}
}

class YSEntry extends Entry {
	constructor(parent_event, data) { 
		super(parent_event, data.id,
			data.sailNumber, data.name, data.design,
			data.owner.firstName + " " + data.owner.lastName,
			data.split.splitCircle, data.split.splitDivision,
			data.split.splitClassName, data);
	}

	// Function to parse the results from YachtScoring and return an array
	static parse(data, parent_entry=undefined) {
		let allEntries = [];
		for ( let c=0; c < data.data.length; c++ ) { 
			let this_circle = data.data[c];
		  	for ( let d=0; d < this_circle.splitDivisions.length; d++ ) { 
				let this_div = this_circle.splitDivisions[d];
				for ( let s=0; s < this_div.splitClasses.length; s++ ) { 
					let this_section = this_div.splitClasses[s];
					this_section.eventBoats.map((boat) => allEntries.push(new YSEntry( (parent_entry == undefined ? new YSEvent(boat.entryInfo) : parent_entry), boat)));
				}
			}
		}
		return allEntries;
	}
}

class YSRace extends Race {
	constructor(event, data) {
		super(event, data.raceNumber, data.distance, data);
	}
}

class YSResult extends Result {

	constructor(entry, race, data) {
		super(entry, race, data.resultId, 
			moment.duration(data.elapsedTime, 'seconds'), 
			moment.duration(data.correctedTime, 'seconds'), 
			data.placeClass, data.finishStatus, data);

	}

}

/*
 * Functions for data from the ClubSpot
 */

class CSEvent extends Regatta {

	// Function to prepare a data payload for ClubSpot request
	static prepCSreq(req) {
        	req["_ApplicationId"] = "myclubspot2017";
        	req["_ClientVersion"] = "js4.3.1-forked-1.0";
        	req["_InstallationId"] = "328d5797-f836-4db6-bf43-a646801d739e";
        	req["_method"] = "GET"
        	return req;
	}

	constructor(data) { 
		super(data.objectId, data.name, Date.parse(data.startDate.iso), Date.parse(data.endDate.iso), 
			(data.clubObject != undefined ? data.clubObject.name : ""), data);
		this.classes = [];
	}

	static search(query, callback_fn=pass, page=1) { 
		let req = { "where": {
	          "name": { '$text': { '$search': { '$term': query } } },
	              "archived": { '$ne': true },
	              "public": true },
	              "keys": "clubObject.id,clubObject.burgeeURL,clubObject.timezone,clubObject.name,name,location,street,city,state,country,zip,imageURL,startDate,lastChanceDate,endDate,registration_closed,regatta_external,external_regatta_url",
	              "count": page,
	              "limit": 100,
	              "order": "name" };
	
		$.ajax({
			url: "https://theclubspot.com/parse/classes/regattas",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(CSEvent.prepCSreq(req)),
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(data.results.map( (ev) => { return new CSEvent(ev); }));
					if ( data.count > ( page * 100 ) )
						CSEvent.search(query, callback_fn, page + 1);
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});

	}
	// function to get a list of entries and return via a callback function
	getEntries(callback_fn=pass) {
		let parent_event = this;
        	let where_query = {
            		"regattaObject": { "__type": "Pointer", "className": "regattas", "objectId": this.id },
            		"status": "confirmed",
            		"application" : { "$ne": true },
            		"archived": false
        	};
		$.ajax({
			url: "https://theclubspot.com/parse/classes/registrations",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(CSEvent.prepCSreq({ 'where': where_query, 
                		'include': 'boatClassObject,subclassesArray,participantsArray',
                		'order': 'lastName'})),
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(data.results.map( (item) => { return new CSEntry(parent_event, item); }));
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	// Function to load the registered entries (boats) for a YS event
	getResults(callback_fn=pass) {
		let parent_event = this;
        	let where_query = {
            		"regattaObject": { "__type": "Pointer", "className": "regattas", "objectId": this.id },
            		"archived": false
        	};
		$.ajax({
			url: "https://theclubspot.com/parse/classes/boatClasses",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify(CSEvent.prepCSreq({ 'where': where_query, 
                		'order': 'name'})),
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					parent_event.classes = data.results;
					parent_event.classes.forEach( (a_class) => parent_event.loadClassResults(a_class, callback_fn) );
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	loadClassResults(a_class, callback_fn=pass) {
		let parent_event = this;
		$.ajax({
			url: "https://results.theclubspot.com/clubspot-results-v4/" + parent_event.id,
			type: "GET",
			data: { 'boatClassIDs': a_class.objectId },
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(parent_event.parseScores(data.scoresByRegistration));	
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	parseScores(score_data) {
		let allScores = [];
		for ( const boat_data of score_data ) { 
			let a_boat = new CSEntry(this, boat_data.registrationObject);
			for ( const race_data of boat_data.scoring_data ) {
				allScores.push(new CSResult(a_boat, race_data));
			}
		}
		return allScores;
	}

}

class CSEntry extends Entry {
	constructor(parent_event, data) { 
		super(parent_event, data.objectId,
			data.sailNumber, data.boatName, data.boatType,
			data.firstName + " " + data.lastName,
			"", "", data.boatClassObject.name, data);
	}
}

class CSResult extends Result {
	constructor(entry, data) {
		super(entry, new Race(entry.event, data.race_number, data.start_data.distance), data.scoreId, 
			moment.duration(data.milliseconds_elapsed, 'milliseconds'), 
			moment.duration(data.corrected_time, 'milliseconds'), 
			data.points, data.letterScore, data);
	}
}


class RMEvent extends Regatta {
	constructor(data) {
		super(data.id, 
			data.name, 
			Date.parse(data.details.startDate), 
			Date.parse(data.details.endDate), 
			data.club.name, 
			data);
		this.classes = [];
	}

	static loadTable(table) { 
		$.ajax({
			url: "https://railmeets.com/api/v1/regattas",
			type: "GET",
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					let events = data.regattas.map( (ev_data) => { return new RMEvent(ev_data); });
					table.rows.add(events).draw();
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	// function to get a list of entries and return via a callback function
	getEntries(callback_fn=pass) {
		let parent_event = this;
		$.ajax({
			url: "https://railmeets.com/api/dt/regattas/" + parent_event.id + "/fleetassignments",
			type: "GET",
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					callback_fn(data.data.map( (item) => { return new RMEntry(parent_event, item); }));
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});
	}

	getResults(callback_fn=pass) {
		let parent_event = this;
		$.ajax({
			url: "https://railmeets.com/api/v1/regattas/" + parent_event.id + "/results",
			type: "GET",
			dataType: "json",
			success: function (data, status, http) { 
				if ( http.status==200 ) { 
					data.fleetResults.forEach( (fleet_res) => { parent_event.parseFleetResults(fleet_res, callback_fn) } );
				}
			},
			error: function (http, status, error) { 
				alert(status);
			}
		});

	}

	parseFleetResults(fleet_data, callback_fn) {
		const fleet_info = fleet_data.fleet;
		fleet_info.races = [];
		fleet_data.results.map( (a_res) => { callback_fn(this.createResults(fleet_info, a_res)); });
	}

	createResults(fleet_info, a_res) { 
		let entry = new Entry(this, "", a_res.registration.sailNumber, 
			a_res.registration.boatName, a_res.registration, a_res.skipperName,
			fleet_info.division.series.name, fleet_info.division.name, fleet_info.name);
		return a_res.raceResults.map( (res_item, i) => {
			if (! (i in fleet_info.races) ) {
				fleet_info.races[i] = new Race(this, i + 1, "");
			}
			return new RMResult(entry, fleet_info.races[i], res_item);
		});
	}

}

class RMEntry extends Entry {
	constructor(parent_event, data) { 
		super(parent_event, data.boatId,
			data.sailNumber, data.boatName, 
			data.mfrName, data.skipperName,
			data.seriesName, data.divisionName, data.fleetName, data);
		this.assignment_id = data.id;
	}
}


class RMResult extends Result {

	constructor(entry, race, data) {
		super(entry, race, "",
			moment.duration(moment(data.finish, moment.ISO_8601).diff(moment(data.start, moment.ISO_8601))),
			moment.duration(data.corrected),
			"", data.status, data);

	}



}
