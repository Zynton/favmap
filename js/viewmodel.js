function ViewModel() {
	var that = this;

	this.searchInput = ko.observable("");
	this.filterString = ko.observable("");
	this.toast = ko.observable({type: "info", message: ""}); // Accepts types info, error and success

	this.toast.subscribe(function() {
		$('#toast').toggleClass(that.toast().type);
		$('#toast').toggleClass('show');

	    // After 3 seconds, remove the show class from DIV
	    setTimeout(function() {
	    	$('#toast').toggleClass('show');
	    	$('#toast').toggleClass(that.toast().type);
	    }, 3000);
	})

	this.map;
	this.searchBox;

	this.tempMarker;
	this.largeInfowindow = new google.maps.InfoWindow();
	this.defaultIcon;
	this.savedIcon;

	this.currentPlace;

	this.savedPlaces = ko.observableArray();
	// Add saved places from local storage
	/*var lsPlaces = localStorage.getItem('savedPlaces')
	if (lsPlaces) {
		console.log(lsPlaces);
		this.savedPlaces(lsPlaces);
		console.log(this.savedPlaces());
	};*/
	this.savedPlaces.subscribe(function() {
		// Add all places to filteredPlaces
		that.filterPlaces();
		// Reinitialize the filter
		that.filterString("");
		// Update the markers
		that.updateMarkers();
		// Store itself in localStorage
		//localStorage.setItem("savedPlaces", ko.toJSON(that.savedPlaces()));
	});

	this.filteredPlaces = ko.observableArray();
	this.filterString.subscribe(function() {
		that.filterPlaces();
		that.updateMarkers();
	});

	/* INITIALIZATION */

	// Initialize the map. Called on load (see below).
	this.initMap = function() {
		// Constructor creates a new map - only center and zoom are required.
		this.map = new google.maps.Map(document.getElementById('map'), {
			center: {lat: 40.7413549, lng: -73.9980244},
			zoom: 13,
	        disableDefaultUI: true,
	        maxZoom: 17
		});
	};

	// Initialize the searchbox. Called on load (see below).
	this.initSearchbox = function() {
		// Create a searchbox in order to execute a places search
		var searchElem = document.getElementById('places-search');
	    this.searchBox = new google.maps.places.SearchBox(searchElem);

	    // Bias the SearchBox results towards current map's viewport.
	    that.map.addListener('bounds_changed', function() {
	    	that.searchBox.setBounds(that.map.getBounds());
	    });

	    // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
	    google.maps.event.addListener(that.searchBox, 'places_changed', function () {
	    	// Trigger an input event on the searchBox so KO updates the value
		    ko.utils.triggerEvent(searchElem, "input");
		    // Search the place
	    	that.searchBoxPlace();
		});
	};

	// From Udacity course.
	// This function takes in a COLOR, and then creates a new marker
    // icon of that color. The icon will be 21 px wide by 34 high, have an origin
    // of 0, 0 and be anchored at 10, 34).
    this.makeMarkerIcon = function(markerColor) {
    	var markerImage = new google.maps.MarkerImage(
          	'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
          	'|40|_|%E2%80%A2',
          	new google.maps.Size(21, 34),
          	new google.maps.Point(0, 0),
          	new google.maps.Point(10, 34),
          	new google.maps.Size(21,34)
        );
        return markerImage;
    };

	this.initMap();
	this.initSearchbox();
	this.defaultIcon = this.makeMarkerIcon('f75850');
	this.savedIcon = this.makeMarkerIcon('ffc107');

	/* END INITIALIZATION */

	this.searchPlace = function() {
		var bounds = that.map.getBounds();
        var placesService = new google.maps.places.PlacesService(that.map);
        
        placesService.textSearch({
          	query: that.searchInput(),
          	bounds: bounds
        }, function(places, status) {
          	if (status === google.maps.places.PlacesServiceStatus.OK) {
            	if (places.length == 0) {
			    	that.toast({type: "error", message: "Error: Couldn't find a place."});
			    } else {
			    	that.getPlaceDetails(places[0]);
			    };
          	} else {
          		var message = "Error: Couldn't get the info from Google... ";
          		message += "Test your Internet connexion and try again.";
          		that.toast({type: "error", message: message});
          	};
        });
	};

	this.searchBoxPlace = function() {
		var places = that.searchBox.getPlaces();
        
        if (places.length == 0) {
	    	that.toast({type: "error", message: "Error: Couldn't find a place."});
	    } else {
	    	var place = new Place(places[0]);
		    that.zoomOnPlace(place);
		    that.addMarker(place, true);
	    };
	};

	this.getPlaceDetails = function(place) {
		var placesService = new google.maps.places.PlacesService(that.map);

		placesService.getDetails({
        	placeId: place.place_id
        }, function(place, status) {
          	if (status === google.maps.places.PlacesServiceStatus.OK) {
            	var place = new Place(place);
			    that.zoomOnPlace(place);
			    that.addMarker(place, true);
            } else {
            	var message = "Error: Couldn't get the info from Google... ";
          		message += "Test your Internet connexion and try again.";
          		that.toast({type: "error", message: message});
            };
        });
	};

	this.zoomOnPlace = function(place) {
		// Get the latlng
		var latlng = place.location;
	    
	    // Center the map on it and zoom
	    that.map.setCenter(latlng);
	    that.map.setZoom(17);

	    // Set currentPlace to this place
	    that.currentPlace = place;
	};

	// Adds a marker to the map. If temp is true, the marker is temporary.
	this.addMarker = function(place, temp) {
		var latlng = place.location;
		var formatted_address = place.formatted_address;

		if (temp) {
			var icon = that.defaultIcon;
		} else {
			var icon = that.savedIcon;
		}

		var marker = new google.maps.Marker({
			position: latlng,
			map: that.map,
			title: place.name,
            animation: google.maps.Animation.DROP,
            icon: icon
        });

		if (temp) {
	        that.updateTempMarker(marker);
	    };

	    var infowindow = that.addInfoWindow(marker, place);

	    return marker;
	};

	this.addInfoWindow = function(marker, place) {
		that.populateInfoWindow(marker, place);

		marker.addListener('click', function() {
            that.largeInfowindow.open(that.map, this);
        });
	};

	this.populateInfoWindow = function(marker, place) {
		var content = '<div class="infowindow">';
		content += '<h5 class="infowindow-header">';
		content += '<img width="20px" height="20px" src="';
		content += place.icon + '" class="float-left">';
		content += place.name + '</h5>';
		content += '<p class="infowindow-subtitle">';
		if (place.price_level) {
			content += '<span class="float-left">';
			for (var i = 0; i < place.price_level; i++) {
				content += '<i class="fa fa-dollar-sign"></i>';
			};
			content += '</span>';
		};
		content += place.type + '</p>';
		content += place.formatted_address;
		content += '</div>';
        // Check to make sure the infowindow is not already opened on this marker.
        if (that.largeInfowindow.marker != marker) {
          	that.largeInfowindow.marker = marker;
          	that.largeInfowindow.setContent(content);
        };
        that.largeInfowindow.open(that.map, marker);
      	// Make sure the marker property is cleared if the infowindow is closed.
      	that.largeInfowindow.addListener('closeclick',function(){
        	that.largeInfowindow.setMarker = null;
      	});
    };

	this.updateTempMarker = function(marker) {
		// Remove previous tempMarker
		if (that.tempMarker) {
			that.tempMarker.setMap(null);
		};
		that.tempMarker = marker;
	};

	this.hideSavedMarkers = function() {
		for (var i = 0; i < that.savedPlaces().length; i++) {
			that.savedPlaces()[i].marker.setMap(null);
		};
	};

	this.showFilteredMarkers = function() {
		if (that.filteredPlaces().length > 0) {
			var bounds = new google.maps.LatLngBounds();
			for (var i = 0; i < that.filteredPlaces().length; i++) {
				var marker = that.filteredPlaces()[i].marker;
				marker.setMap(that.map);
				bounds.extend(marker.position);
			};
			// Extend the boundaries of the map for each marker
	        that.map.fitBounds(bounds);
	    };
	};

	this.updateMarkers = function() {
		that.hideSavedMarkers();
		that.showFilteredMarkers();
	};

	this.savePlace = function() {
		if (!that.currentPlace) {
			that.toast({type: "error", message: "Error: there is no place to save."});
			return;
		};

		var marker = that.addMarker(that.currentPlace);
		that.savedPlaces.push({'place': that.currentPlace, 'marker': marker});
		that.tempMarker.setMap(null);
		that.searchInput("");
		that.toast({type: "success", message: that.currentPlace.name + " was saved as a favorite."});
	};

	this.locateSavedPlace = function(place) {
		that.zoomOnPlace(place.place);
        that.populateInfoWindow(place.marker, place.place);
	};

	this.filterPlaces = function() {
		that.filteredPlaces.removeAll();
		for (var i = 0; i < that.savedPlaces().length; i++) {
			var item = that.savedPlaces()[i];
			var filter = that.filterString().toLowerCase();
			var itemName = item.place.name.toLowerCase();
			var itemAddress = item.place.formatted_address.toLowerCase();
			if (itemName.indexOf(filter) >= 0 || itemAddress.indexOf(filter) >= 0) {
		    	that.filteredPlaces.push(item);
		    };
		};
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