'use strict';

var restaurants = void 0,
    neighborhoods = void 0,
    cuisines = void 0,
    map = void 0;
var liveMap = false;
var initLoad = true;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', function (event) {
	fetchNeighborhoods();
	fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
var fetchNeighborhoods = function fetchNeighborhoods() {
	DBHelper.fetchNeighborhoods(function (error, neighborhoods) {
		if (error) {
			// Got an error
			console.error(error);
		} else {
			self.neighborhoods = neighborhoods;
			fillNeighborhoodsHTML();
		}
	});
};

/**
 * Set neighborhoods HTML.
 */
var fillNeighborhoodsHTML = function fillNeighborhoodsHTML() {
	var neighborhoods = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.neighborhoods;

	var select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(function (neighborhood) {
		var option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
};

/**
 * Fetch all cuisines and set their HTML.
 */
var fetchCuisines = function fetchCuisines() {
	DBHelper.fetchCuisines(function (error, cuisines) {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
};

/**
 * Set cuisines HTML.
 */
var fillCuisinesHTML = function fillCuisinesHTML() {
	var cuisines = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.cuisines;

	var select = document.getElementById('cuisines-select');

	cuisines.forEach(function (cuisine) {
		var option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = function () {
	updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
var updateRestaurants = function updateRestaurants() {
	var cSelect = document.getElementById('cuisines-select');
	var nSelect = document.getElementById('neighborhoods-select');

	var cIndex = cSelect.selectedIndex;
	var nIndex = nSelect.selectedIndex;

	var cuisine = cSelect[cIndex].value;
	var neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, function (error, restaurants) {
		if (error) {
			// Got an error!
			console.error(error);
		} else {
			resetRestaurants(restaurants);
			fillRestaurantsHTML();
		}
	});
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
var resetRestaurants = function resetRestaurants(restaurants) {
	// Remove all restaurants
	self.restaurants = [];
	var ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	self.markers.forEach(function (m) {
		return m.setMap(null);
	});
	self.markers = [];
	self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */

/* If a live map isn't already enabled, removes the static map image and replaces it with a live Google Map. */
var getLiveMap = function getLiveMap() {
	updateRestaurants();
	if (liveMap) {
		return;
	} else {
		var staticMapImg = document.getElementById('static-map-img');
		staticMapImg.parentNode.removeChild(staticMapImg);
		var loc = {
			lat: 40.722216,
			lng: -73.987501
		};
		self.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 12,
			center: loc,
			scrollwheel: false
		});
		liveMap = true;
	}
};

var fillRestaurantsHTML = function fillRestaurantsHTML() {
	var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

	var ul = document.getElementById('restaurants-list');
	restaurants.forEach(function (restaurant) {
		ul.append(createRestaurantHTML(restaurant));
	});

	/* Loads a static map image if it's the initial page load. Adds a click event listener so that when the user clicks on the map, it removes the static map image and loads a live map in its place. */
	if (initLoad) {
		fetchNeighborhoods();
		fetchCuisines();
		var staticMap = DBHelper.staticImageForMapIndex(self.restaurants);
		var _map = document.getElementById('map');
		var staticMapImg = document.createElement('img');
		staticMapImg.id = 'static-map-img';
		staticMapImg.alt = 'Static Google Maps image';
		staticMapImg.style.width = _map.clientWidth + 'px';
		staticMapImg.style.height = _map.clientHeight + 'px';
		staticMapImg.src = staticMap;
		staticMapImg.addEventListener('click', function () {
			getLiveMap();
		});
		_map.appendChild(staticMapImg);
		initLoad = false;
	} else {
		addMarkersToMap();
	}
};

/**
 * Create restaurant HTML.
 */
var createRestaurantHTML = function createRestaurantHTML(restaurant) {
	/* Lazy loads small or large version of restaurant image based on data-srcset and auto data-sizes. Also dynamically sets alt and title text of the image. */
	var li = document.createElement('li');
	var image = document.createElement('img');
	image.className = 'restaurant-img lazyload';

	/* Backup code without lazy load
 image.src = DBHelper.smallImageUrlForRestaurant(restaurant);
 image.srcset = `${DBHelper.smallImageUrlForRestaurant(restaurant)} 400w, ${DBHelper.largeImageUrlForRestaurant(restaurant)} 800w`;
 image.sizes = '50vw'; */
	image.setAttribute('data-src', DBHelper.smallImageUrlForRestaurant(restaurant) + ' 400w');
	image.setAttribute('data-srcset', DBHelper.smallImageUrlForRestaurant(restaurant) + ' 400w, ' + DBHelper.largeImageUrlForRestaurant(restaurant) + ' 800w');
	image.setAttribute('data-sizes', 'auto');
	image.title = '' + restaurant.name;
	image.alt = restaurant.name + ' in ' + restaurant.neighborhood + ' - ' + restaurant.cuisine_type + ' restaurant';
	li.append(image);

	var name = document.createElement('h3');
	name.innerHTML = restaurant.name;
	li.append(name);

	var neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	li.append(neighborhood);

	var address = document.createElement('p');
	address.innerHTML = restaurant.address;
	li.append(address);

	//Create empty element so flex grow can be applied and create space to vertically align View Details buttons.
	var empty = document.createElement('p');
	empty.className = 'restaurant-empty';
	li.append(empty);

	var more = document.createElement('a');
	more.innerHTML = 'View Restaurant Details';
	more.href = DBHelper.urlForRestaurant(restaurant);

	//Dynamically set title attribute
	more.title = restaurant.name + ' - View Restaurant Details';

	//Set ARIA attributes to each restaurant link
	more.setAttribute('role', 'button');
	more.setAttribute('tabindex', '0');
	more.setAttribute('aria-label', 'View' + restaurant.name + 'Restaurant Details');
	li.append(more);

	return li;
};

/**
 * Add markers for current restaurants to the map.
 */
var addMarkersToMap = function addMarkersToMap() {
	var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

	restaurants.forEach(function (restaurant) {
		// Add marker to the map
		var marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		google.maps.event.addListener(marker, 'click', function () {
			window.location.href = marker.url;
		});
		self.markers.push(marker);
	});
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOlsicmVzdGF1cmFudHMiLCJuZWlnaGJvcmhvb2RzIiwiY3Vpc2luZXMiLCJtYXAiLCJsaXZlTWFwIiwiaW5pdExvYWQiLCJtYXJrZXJzIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJmZXRjaE5laWdoYm9yaG9vZHMiLCJmZXRjaEN1aXNpbmVzIiwiREJIZWxwZXIiLCJlcnJvciIsImNvbnNvbGUiLCJzZWxmIiwiZmlsbE5laWdoYm9yaG9vZHNIVE1MIiwic2VsZWN0IiwiZ2V0RWxlbWVudEJ5SWQiLCJmb3JFYWNoIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsIm5laWdoYm9yaG9vZCIsInZhbHVlIiwiYXBwZW5kIiwiZmlsbEN1aXNpbmVzSFRNTCIsImN1aXNpbmUiLCJ3aW5kb3ciLCJpbml0TWFwIiwidXBkYXRlUmVzdGF1cmFudHMiLCJjU2VsZWN0IiwiblNlbGVjdCIsImNJbmRleCIsInNlbGVjdGVkSW5kZXgiLCJuSW5kZXgiLCJmZXRjaFJlc3RhdXJhbnRCeUN1aXNpbmVBbmROZWlnaGJvcmhvb2QiLCJyZXNldFJlc3RhdXJhbnRzIiwiZmlsbFJlc3RhdXJhbnRzSFRNTCIsInVsIiwibSIsInNldE1hcCIsImdldExpdmVNYXAiLCJzdGF0aWNNYXBJbWciLCJwYXJlbnROb2RlIiwicmVtb3ZlQ2hpbGQiLCJsb2MiLCJsYXQiLCJsbmciLCJnb29nbGUiLCJtYXBzIiwiTWFwIiwiem9vbSIsImNlbnRlciIsInNjcm9sbHdoZWVsIiwiY3JlYXRlUmVzdGF1cmFudEhUTUwiLCJyZXN0YXVyYW50Iiwic3RhdGljTWFwIiwic3RhdGljSW1hZ2VGb3JNYXBJbmRleCIsImlkIiwiYWx0Iiwic3R5bGUiLCJ3aWR0aCIsImNsaWVudFdpZHRoIiwiaGVpZ2h0IiwiY2xpZW50SGVpZ2h0Iiwic3JjIiwiYXBwZW5kQ2hpbGQiLCJhZGRNYXJrZXJzVG9NYXAiLCJsaSIsImltYWdlIiwiY2xhc3NOYW1lIiwic2V0QXR0cmlidXRlIiwic21hbGxJbWFnZVVybEZvclJlc3RhdXJhbnQiLCJsYXJnZUltYWdlVXJsRm9yUmVzdGF1cmFudCIsInRpdGxlIiwibmFtZSIsImN1aXNpbmVfdHlwZSIsImFkZHJlc3MiLCJlbXB0eSIsIm1vcmUiLCJocmVmIiwidXJsRm9yUmVzdGF1cmFudCIsIm1hcmtlciIsIm1hcE1hcmtlckZvclJlc3RhdXJhbnQiLCJhZGRMaXN0ZW5lciIsImxvY2F0aW9uIiwidXJsIiwicHVzaCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxJQUFJQSxvQkFBSjtBQUFBLElBQ0NDLHNCQUREO0FBQUEsSUFFQ0MsaUJBRkQ7QUFBQSxJQUdDQyxZQUhEO0FBSUEsSUFBSUMsVUFBVSxLQUFkO0FBQ0EsSUFBSUMsV0FBVyxJQUFmO0FBQ0EsSUFBSUMsVUFBVSxFQUFkOztBQUVBOzs7QUFHQUMsU0FBU0MsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDLFVBQUNDLEtBQUQsRUFBVztBQUN4REM7QUFDQUM7QUFDQSxDQUhEOztBQUtBOzs7QUFHQSxJQUFNRCxxQkFBcUIsU0FBckJBLGtCQUFxQixHQUFNO0FBQ2hDRSxVQUFTRixrQkFBVCxDQUE0QixVQUFDRyxLQUFELEVBQVFaLGFBQVIsRUFBMEI7QUFDckQsTUFBSVksS0FBSixFQUFXO0FBQ1Y7QUFDQUMsV0FBUUQsS0FBUixDQUFjQSxLQUFkO0FBQ0EsR0FIRCxNQUdPO0FBQ05FLFFBQUtkLGFBQUwsR0FBcUJBLGFBQXJCO0FBQ0FlO0FBQ0E7QUFDRCxFQVJEO0FBU0EsQ0FWRDs7QUFZQTs7O0FBR0EsSUFBTUEsd0JBQXdCLFNBQXhCQSxxQkFBd0IsR0FBd0M7QUFBQSxLQUF2Q2YsYUFBdUMsdUVBQXZCYyxLQUFLZCxhQUFrQjs7QUFDckUsS0FBTWdCLFNBQVNWLFNBQVNXLGNBQVQsQ0FBd0Isc0JBQXhCLENBQWY7QUFDQWpCLGVBQWNrQixPQUFkLENBQXNCLHdCQUFnQjtBQUNyQyxNQUFNQyxTQUFTYixTQUFTYyxhQUFULENBQXVCLFFBQXZC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LElBQWIsQ0FBa0JMLE1BQWxCO0FBQ0EsRUFQRDtBQVFBLENBVEQiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImxldCByZXN0YXVyYW50cyxcblx0bmVpZ2hib3Job29kcyxcblx0Y3Vpc2luZXMsXG5cdG1hcDtcbmxldCBsaXZlTWFwID0gZmFsc2U7XG5sZXQgaW5pdExvYWQgPSB0cnVlO1xubGV0IG1hcmtlcnMgPSBbXTtcblxuLyoqXG4gKiBGZXRjaCBuZWlnaGJvcmhvb2RzIGFuZCBjdWlzaW5lcyBhcyBzb29uIGFzIHRoZSBwYWdlIGlzIGxvYWRlZC5cbiAqL1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIChldmVudCkgPT4ge1xuXHRmZXRjaE5laWdoYm9yaG9vZHMoKTtcblx0ZmV0Y2hDdWlzaW5lcygpO1xufSk7XG5cbi8qKlxuICogRmV0Y2ggYWxsIG5laWdoYm9yaG9vZHMgYW5kIHNldCB0aGVpciBIVE1MLlxuICovXG5jb25zdCBmZXRjaE5laWdoYm9yaG9vZHMgPSAoKSA9PiB7XG5cdERCSGVscGVyLmZldGNoTmVpZ2hib3Job29kcygoZXJyb3IsIG5laWdoYm9yaG9vZHMpID0+IHtcblx0XHRpZiAoZXJyb3IpIHsgXG5cdFx0XHQvLyBHb3QgYW4gZXJyb3Jcblx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZWxmLm5laWdoYm9yaG9vZHMgPSBuZWlnaGJvcmhvb2RzO1xuXHRcdFx0ZmlsbE5laWdoYm9yaG9vZHNIVE1MKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbi8qKlxuICogU2V0IG5laWdoYm9yaG9vZHMgSFRNTC5cbiAqL1xuY29uc3QgZmlsbE5laWdoYm9yaG9vZHNIVE1MID0gKG5laWdoYm9yaG9vZHMgPSBzZWxmLm5laWdoYm9yaG9vZHMpID0+IHtcblx0Y29uc3Qgc2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25laWdoYm9yaG9vZHMtc2VsZWN0Jyk7XG5cdG5laWdoYm9yaG9vZHMuZm9yRWFjaChuZWlnaGJvcmhvb2QgPT4ge1xuXHRcdGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuXHRcdG9wdGlvbi5pbm5lckhUTUwgPSBuZWlnaGJvcmhvb2Q7XG5cdFx0b3B0aW9uLnZhbHVlID0gbmVpZ2hib3Job29kO1xuXHRcdHNlbGVjdC5hcHBlbmQob3B0aW9uKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIEZldGNoIGFsbCBjdWlzaW5lcyBhbmQgc2V0IHRoZWlyIEhUTUwuXG4gKi9cbmNvbnN0IGZldGNoQ3Vpc2luZXMgPSAoKSA9PiB7XG5cdERCSGVscGVyLmZldGNoQ3Vpc2luZXMoKGVycm9yLCBjdWlzaW5lcykgPT4ge1xuXHRcdGlmIChlcnJvcikgeyBcblx0XHRcdC8vIEdvdCBhbiBlcnJvciFcblx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZWxmLmN1aXNpbmVzID0gY3Vpc2luZXM7XG5cdFx0XHRmaWxsQ3Vpc2luZXNIVE1MKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbi8qKlxuICogU2V0IGN1aXNpbmVzIEhUTUwuXG4gKi9cbmNvbnN0IGZpbGxDdWlzaW5lc0hUTUwgPSAoY3Vpc2luZXMgPSBzZWxmLmN1aXNpbmVzKSA9PiB7XG5cdGNvbnN0IHNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdWlzaW5lcy1zZWxlY3QnKTtcblxuXHRjdWlzaW5lcy5mb3JFYWNoKGN1aXNpbmUgPT4ge1xuXHRcdGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuXHRcdG9wdGlvbi5pbm5lckhUTUwgPSBjdWlzaW5lO1xuXHRcdG9wdGlvbi52YWx1ZSA9IGN1aXNpbmU7XG5cdFx0c2VsZWN0LmFwcGVuZChvcHRpb24pO1xuXHR9KTtcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxuICovXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcblx0dXBkYXRlUmVzdGF1cmFudHMoKTtcbn07XG5cbi8qKlxuICogVXBkYXRlIHBhZ2UgYW5kIG1hcCBmb3IgY3VycmVudCByZXN0YXVyYW50cy5cbiAqL1xuY29uc3QgdXBkYXRlUmVzdGF1cmFudHMgPSAoKSA9PiB7XG5cdGNvbnN0IGNTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3Vpc2luZXMtc2VsZWN0Jyk7XG5cdGNvbnN0IG5TZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmVpZ2hib3Job29kcy1zZWxlY3QnKTtcblxuXHRjb25zdCBjSW5kZXggPSBjU2VsZWN0LnNlbGVjdGVkSW5kZXg7XG5cdGNvbnN0IG5JbmRleCA9IG5TZWxlY3Quc2VsZWN0ZWRJbmRleDtcblxuXHRjb25zdCBjdWlzaW5lID0gY1NlbGVjdFtjSW5kZXhdLnZhbHVlO1xuXHRjb25zdCBuZWlnaGJvcmhvb2QgPSBuU2VsZWN0W25JbmRleF0udmFsdWU7XG5cblx0REJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kKGN1aXNpbmUsIG5laWdoYm9yaG9vZCwgKGVycm9yLCByZXN0YXVyYW50cykgPT4ge1xuXHRcdGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXG5cdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzZXRSZXN0YXVyYW50cyhyZXN0YXVyYW50cyk7XG5cdFx0XHRmaWxsUmVzdGF1cmFudHNIVE1MKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbi8qKlxuICogQ2xlYXIgY3VycmVudCByZXN0YXVyYW50cywgdGhlaXIgSFRNTCBhbmQgcmVtb3ZlIHRoZWlyIG1hcCBtYXJrZXJzLlxuICovXG5jb25zdCByZXNldFJlc3RhdXJhbnRzID0gKHJlc3RhdXJhbnRzKSA9PiB7XG5cdC8vIFJlbW92ZSBhbGwgcmVzdGF1cmFudHNcblx0c2VsZi5yZXN0YXVyYW50cyA9IFtdO1xuXHRjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50cy1saXN0Jyk7XG5cdHVsLmlubmVySFRNTCA9ICcnO1xuXG5cdC8vIFJlbW92ZSBhbGwgbWFwIG1hcmtlcnNcblx0c2VsZi5tYXJrZXJzLmZvckVhY2gobSA9PiBtLnNldE1hcChudWxsKSk7XG5cdHNlbGYubWFya2VycyA9IFtdO1xuXHRzZWxmLnJlc3RhdXJhbnRzID0gcmVzdGF1cmFudHM7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbGwgcmVzdGF1cmFudHMgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXG4gKi9cblxuLyogSWYgYSBsaXZlIG1hcCBpc24ndCBhbHJlYWR5IGVuYWJsZWQsIHJlbW92ZXMgdGhlIHN0YXRpYyBtYXAgaW1hZ2UgYW5kIHJlcGxhY2VzIGl0IHdpdGggYSBsaXZlIEdvb2dsZSBNYXAuICovXG5jb25zdCBnZXRMaXZlTWFwID0gKCkgPT4ge1xuXHR1cGRhdGVSZXN0YXVyYW50cygpO1xuXHRpZihsaXZlTWFwKXtcblx0XHRyZXR1cm47XG5cdH0gZWxzZSB7XG5cdFx0Y29uc3Qgc3RhdGljTWFwSW1nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXRpYy1tYXAtaW1nJyk7XG5cdFx0c3RhdGljTWFwSW1nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3RhdGljTWFwSW1nKTtcblx0XHRsZXQgbG9jID0ge1xuXHRcdFx0bGF0OiA0MC43MjIyMTYsXG5cdFx0XHRsbmc6IC03My45ODc1MDFcblx0XHR9O1xuXHRcdHNlbGYubWFwID0gbmV3IGdvb2dsZVxuXHRcdFx0Lm1hcHNcblx0XHRcdC5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XG5cdFx0XHRcdHpvb206IDEyLFxuXHRcdFx0XHRjZW50ZXI6IGxvYyxcblx0XHRcdFx0c2Nyb2xsd2hlZWw6IGZhbHNlXG5cdFx0XHR9KTtcblx0XHRsaXZlTWFwID0gdHJ1ZTtcblx0fVxufTtcblxuY29uc3QgZmlsbFJlc3RhdXJhbnRzSFRNTCA9IChyZXN0YXVyYW50cyA9IHNlbGYucmVzdGF1cmFudHMpID0+IHtcblx0Y29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudHMtbGlzdCcpO1xuXHRyZXN0YXVyYW50cy5mb3JFYWNoKHJlc3RhdXJhbnQgPT4ge1xuXHRcdHVsLmFwcGVuZChjcmVhdGVSZXN0YXVyYW50SFRNTChyZXN0YXVyYW50KSk7XG5cdH0pO1xuXHRcblx0LyogTG9hZHMgYSBzdGF0aWMgbWFwIGltYWdlIGlmIGl0J3MgdGhlIGluaXRpYWwgcGFnZSBsb2FkLiBBZGRzIGEgY2xpY2sgZXZlbnQgbGlzdGVuZXIgc28gdGhhdCB3aGVuIHRoZSB1c2VyIGNsaWNrcyBvbiB0aGUgbWFwLCBpdCByZW1vdmVzIHRoZSBzdGF0aWMgbWFwIGltYWdlIGFuZCBsb2FkcyBhIGxpdmUgbWFwIGluIGl0cyBwbGFjZS4gKi9cblx0aWYgKGluaXRMb2FkKXtcblx0XHRmZXRjaE5laWdoYm9yaG9vZHMoKTtcblx0XHRmZXRjaEN1aXNpbmVzKCk7XG5cdFx0Y29uc3Qgc3RhdGljTWFwID0gREJIZWxwZXIuc3RhdGljSW1hZ2VGb3JNYXBJbmRleChzZWxmLnJlc3RhdXJhbnRzKTtcblx0XHRjb25zdCBtYXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyk7XG5cdFx0Y29uc3Qgc3RhdGljTWFwSW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cdFx0c3RhdGljTWFwSW1nLmlkID0gJ3N0YXRpYy1tYXAtaW1nJztcblx0XHRzdGF0aWNNYXBJbWcuYWx0ID0gJ1N0YXRpYyBHb29nbGUgTWFwcyBpbWFnZSc7XG5cdFx0c3RhdGljTWFwSW1nLnN0eWxlLndpZHRoID0gYCR7bWFwLmNsaWVudFdpZHRofXB4YDtcblx0XHRzdGF0aWNNYXBJbWcuc3R5bGUuaGVpZ2h0ID0gYCR7bWFwLmNsaWVudEhlaWdodH1weGA7XG5cdFx0c3RhdGljTWFwSW1nLnNyYyA9IHN0YXRpY01hcDtcblx0XHRzdGF0aWNNYXBJbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRnZXRMaXZlTWFwKCk7XG5cdFx0fSk7XG5cdFx0bWFwLmFwcGVuZENoaWxkKHN0YXRpY01hcEltZyk7XG5cdFx0aW5pdExvYWQgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHRhZGRNYXJrZXJzVG9NYXAoKTtcblx0fVxufTtcblxuLyoqXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MLlxuICovXG5jb25zdCBjcmVhdGVSZXN0YXVyYW50SFRNTCA9IHJlc3RhdXJhbnQgPT4ge1xuXHQvKiBMYXp5IGxvYWRzIHNtYWxsIG9yIGxhcmdlIHZlcnNpb24gb2YgcmVzdGF1cmFudCBpbWFnZSBiYXNlZCBvbiBkYXRhLXNyY3NldCBhbmQgYXV0byBkYXRhLXNpemVzLiBBbHNvIGR5bmFtaWNhbGx5IHNldHMgYWx0IGFuZCB0aXRsZSB0ZXh0IG9mIHRoZSBpbWFnZS4gKi9cblx0Y29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpOyBcblx0Y29uc3QgaW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0aW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nIGxhenlsb2FkJztcblxuXHQvKiBCYWNrdXAgY29kZSB3aXRob3V0IGxhenkgbG9hZFxuXHRpbWFnZS5zcmMgPSBEQkhlbHBlci5zbWFsbEltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcblx0aW1hZ2Uuc3Jjc2V0ID0gYCR7REJIZWxwZXIuc21hbGxJbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCl9IDQwMHcsICR7REJIZWxwZXIubGFyZ2VJbWFnZVVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCl9IDgwMHdgO1xuXHRpbWFnZS5zaXplcyA9ICc1MHZ3JzsgKi9cblx0aW1hZ2Uuc2V0QXR0cmlidXRlKCdkYXRhLXNyYycsIGAke0RCSGVscGVyLnNtYWxsSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA0MDB3YCk7XG5cdGltYWdlLnNldEF0dHJpYnV0ZSgnZGF0YS1zcmNzZXQnLGAke0RCSGVscGVyLnNtYWxsSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA0MDB3LCAke0RCSGVscGVyLmxhcmdlSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA4MDB3YCk7XG5cdGltYWdlLnNldEF0dHJpYnV0ZSgnZGF0YS1zaXplcycsICdhdXRvJyk7XG5cdGltYWdlLnRpdGxlID0gYCR7cmVzdGF1cmFudC5uYW1lfWA7XG5cdGltYWdlLmFsdCA9IGAke3Jlc3RhdXJhbnQubmFtZX0gaW4gJHtyZXN0YXVyYW50Lm5laWdoYm9yaG9vZH0gLSAke3Jlc3RhdXJhbnQuY3Vpc2luZV90eXBlfSByZXN0YXVyYW50YDtcblx0bGkuYXBwZW5kKGltYWdlKTtcblxuXHRjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDMnKTtcblx0bmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG5cdGxpLmFwcGVuZChuYW1lKTtcblxuXHRjb25zdCBuZWlnaGJvcmhvb2QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdG5laWdoYm9yaG9vZC5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5laWdoYm9yaG9vZDtcblx0bGkuYXBwZW5kKG5laWdoYm9yaG9vZCk7XG5cblx0Y29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0YWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XG5cdGxpLmFwcGVuZChhZGRyZXNzKTtcblxuXHQvL0NyZWF0ZSBlbXB0eSBlbGVtZW50IHNvIGZsZXggZ3JvdyBjYW4gYmUgYXBwbGllZCBhbmQgY3JlYXRlIHNwYWNlIHRvIHZlcnRpY2FsbHkgYWxpZ24gVmlldyBEZXRhaWxzIGJ1dHRvbnMuXG5cdGNvbnN0IGVtcHR5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRlbXB0eS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1lbXB0eSc7XG5cdGxpLmFwcGVuZChlbXB0eSk7XG5cblx0Y29uc3QgbW9yZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblx0bW9yZS5pbm5lckhUTUwgPSAnVmlldyBSZXN0YXVyYW50IERldGFpbHMnO1xuXHRtb3JlLmhyZWYgPSBEQkhlbHBlci51cmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xuXG5cdC8vRHluYW1pY2FsbHkgc2V0IHRpdGxlIGF0dHJpYnV0ZVxuXHRtb3JlLnRpdGxlID0gYCR7cmVzdGF1cmFudC5uYW1lfSAtIFZpZXcgUmVzdGF1cmFudCBEZXRhaWxzYDtcblxuXHQvL1NldCBBUklBIGF0dHJpYnV0ZXMgdG8gZWFjaCByZXN0YXVyYW50IGxpbmtcblx0bW9yZS5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnYnV0dG9uJyk7XG5cdG1vcmUuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG5cdG1vcmUuc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ1ZpZXcnICsgcmVzdGF1cmFudC5uYW1lICsgJ1Jlc3RhdXJhbnQgRGV0YWlscycpO1xuXHRsaS5hcHBlbmQobW9yZSk7XG5cblx0cmV0dXJuIGxpO1xufTtcblxuLyoqXG4gKiBBZGQgbWFya2VycyBmb3IgY3VycmVudCByZXN0YXVyYW50cyB0byB0aGUgbWFwLlxuICovXG5jb25zdCBhZGRNYXJrZXJzVG9NYXAgPSAocmVzdGF1cmFudHMgPSBzZWxmLnJlc3RhdXJhbnRzKSA9PiB7XG5cdHJlc3RhdXJhbnRzLmZvckVhY2gocmVzdGF1cmFudCA9PiB7XG5cdFx0Ly8gQWRkIG1hcmtlciB0byB0aGUgbWFwXG5cdFx0Y29uc3QgbWFya2VyID0gREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBzZWxmLm1hcCk7XG5cdFx0Z29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFya2VyLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IG1hcmtlci51cmw7XG5cdFx0fSk7XG5cdFx0c2VsZi5tYXJrZXJzLnB1c2gobWFya2VyKTtcblx0fSk7XG59O1xuIl19
