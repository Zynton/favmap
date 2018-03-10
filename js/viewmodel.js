function ViewModel() {
	var that = this;

	this.searchInput = ko.observable();

	this.map;
	this.searchBox;
	this.tempMarker;
	this.currentPlace;
	this.savedPlaces = ko.observableArray();

	// Initialize the map. Called on load (see below).
	this.initMap = function() {
		// Constructor creates a new map - only center and zoom are required.
		map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: 40.7413549, lng: -73.9980244},
			zoom: 13,
	        disableDefaultUI: true
		});

		return map;
	};

	// Initialize the searchbox. Called on load (see below).
	this.initSearchbox = function() {
		// Create a searchbox in order to execute a places search
		var searchElem = document.getElementById('places-search');
	    var searchBox = new google.maps.places.SearchBox(searchElem);

	    // Bias the SearchBox results towards current map's viewport.
	    that.map.addListener('bounds_changed', function() {
	    	searchBox.setBounds(map.getBounds());
	    });

	    // When selecting a place suggested by Google...
	    google.maps.event.addListener(searchBox, 'places_changed', function () {
	    	// Trigger an input event on the searchBox so KO updates the value
		    ko.utils.triggerEvent(searchElem, "input");
		    // Get the place
		    var places = searchBox.getPlaces();
		    if (!places[0]) {
		    	that.searchPlace(that.searchInput());
		    	return;
		    };
		    that.zoomOnPlace(places[0]);
		    that.addMarker(places[0], true);
		});

		return searchBox;
	};

	this.map = this.initMap();
	this.searchBox = this.initSearchbox();

	this.searchPlace = function() {
		var bounds = that.map.getBounds();
        var placesService = new google.maps.places.PlacesService(map);

        placesService.textSearch({
            query: that.searchInput(),
            bounds: bounds
        }, function(places, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                that.zoomOnPlace(places[0]);
                that.addMarker(places[0], true);
            } else {
            	console.log(status);
            };
        });
	};

	this.zoomOnPlace = function(place) {
		console.log(place);
		// Get the latlng
		var latlng = place.geometry.location;
	    
	    // Center the map on it and zoom
	    map.setCenter(latlng);
	    map.setZoom(17);

	    // Set currentPlace to this place
	    that.currentPlace = place;
	};

	// Adds a marker to the map. If temp is True, the marker is temporary.
	this.addMarker = function(place, temp) {
		var latlng = place.geometry.location;
		var formatted_address = place.formatted_address;

		var marker = new google.maps.Marker({
			position: latlng,
			map: map,
			title: formatted_address
        });

		if (temp) {
	        that.updateTempMarker(marker);
	    };
	};

	this.updateTempMarker = function(marker) {
		// Remove previous tempMarker
		if (that.tempMarker) {
			that.tempMarker.setMap(null);
		};
		that.tempMarker = marker;
	};

	this.savePlace = function() {
		if (!that.currentPlace) {
			console.log("Error: there is no place to save.");
			return;
		};

		var thisPlace = new Place(that.currentPlace);
		that.savedPlaces.push(thisPlace);
		that.addMarker(that.currentPlace)

		console.log(that.savedPlaces);
	};
};

// This function is called as a callback on loading the Google Maps API
function init() {
	var vm = new ViewModel();
	ko.applyBindings(vm);
	$('.sidebar-collapse').on('click', function() {
        $('#sidebar').toggleClass('active');
        $('#top-navbar').toggleClass('push-right');
    });
};