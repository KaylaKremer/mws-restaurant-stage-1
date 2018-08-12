'use strict';

var restaurant = void 0;
var map = void 0;
var liveMap = false;
var initLoad = true;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = function () {
	fetchRestaurantFromURL(function (error, restaurant) {
		if (error) {
			// Got an error!
			console.error(error, restaurant);
		} else {
			fillBreadcrumb();
		}
	});
};

/**
 * Get current restaurant from page URL.
 */
var fetchRestaurantFromURL = function fetchRestaurantFromURL(callback) {
	if (self.restaurant) {
		// restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	var id = getParameterByName('id');
	if (!id) {
		// no id found in URL
		error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, function (error, restaurant) {
			self.restaurant = restaurant;
			if (!restaurant) {
				console.error(error);
				return;
			}
			fillRestaurantHTML();
			callback(null, restaurant);
		});
	}
};

/**
 * Create restaurant HTML and add it to the webpage
 */

/* If a live map isn't already enabled, removes the static map image and replaces it with a live Google Map. */
var getLiveMap = function getLiveMap() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	if (liveMap) {
		return;
	} else {
		var staticMapImg = document.getElementById('static-map-img');
		staticMapImg.parentNode.removeChild(staticMapImg);
		self.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 16,
			center: self.restaurant.latlng,
			scrollwheel: false
		});
		addMarkerToMap();
		liveMap = true;
	}
};

var fillRestaurantHTML = function fillRestaurantHTML() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	/* Loads a static map image if it's the initial page load. Adds a click event listener so that when the user clicks on the map, it removes the static map image and loads a live map in its place. */
	if (initLoad) {
		var staticMap = DBHelper.staticImageForMapRestaurantInfo(self.restaurant);
		var _map = document.getElementById('map');
		var staticMapImg = document.createElement('img');
		staticMapImg.id = 'static-map-img';
		staticMapImg.alt = 'Static Google Maps image';
		staticMapImg.style.width = _map.clientWidth + 'px';
		staticMapImg.style.height = _map.clientHeight + 'px';
		staticMapImg.src = staticMap;
		staticMapImg.addEventListener('click', function () {
			getLiveMap(self.restaurant);
		});
		_map.appendChild(staticMapImg);
		initLoad = false;
	} else {
		addMarkerToMap();
	}
	var name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	var address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	//Create dynamic favorite button
	var favorite = document.getElementById('favorite-button');
	if (restaurant.is_favorite === true) {
		favorite.className = 'restaurant-favorite-true';
		favorite.innerHTML = '<i class="fas fa-heart"></i>';
	} else {
		favorite.className = 'restaurant-favorite-false';
		favorite.innerHTML = '<i class="far fa-heart"></i>';
	}

	/* Lazy loads small or large version of restaurant image based on data-srcset and auto data-sizes. Also dynamically sets alt and title text of the image. */
	var image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img lazyload';
	image.setAttribute('data-src', DBHelper.smallImageUrlForRestaurant(restaurant) + ' 400w');
	image.setAttribute('data-srcset', DBHelper.smallImageUrlForRestaurant(restaurant) + ' 400w, ' + DBHelper.largeImageUrlForRestaurant(restaurant) + ' 800w');
	image.setAttribute('data-sizes', 'auto');
	image.title = '' + restaurant.name;
	image.alt = restaurant.name + ' in ' + restaurant.neighborhood + ' - ' + restaurant.cuisine_type + ' restaurant';

	var cuisine = document.getElementById('restaurant-cuisine');
	cuisine.innerHTML = restaurant.cuisine_type;

	// fill operating hours
	if (restaurant.operating_hours) {
		fillRestaurantHoursHTML();
	}
	// fill reviews
	DBHelper.fetchReviewsById(restaurant.id, fillReviewsHTML);
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
var fillRestaurantHoursHTML = function fillRestaurantHoursHTML() {
	var operatingHours = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant.operating_hours;

	var hours = document.getElementById('restaurant-hours');
	for (var key in operatingHours) {
		var row = document.createElement('tr');
		var day = document.createElement('td');
		day.innerHTML = key;
		row.appendChild(day);
		var time = document.createElement('td');
		time.innerHTML = operatingHours[key];
		row.appendChild(time);
		hours.appendChild(row);
	}
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
var fillReviewsHTML = function fillReviewsHTML(error, reviews) {
	if (error) {
		console.log(error);
	}
	self.restaurant.reviews = reviews;
	var container = document.getElementById('reviews-container');
	var ul = document.getElementById('reviews-list');

	var title = document.createElement('h2');
	title.innerHTML = 'Reviews';
	container.insertBefore(title, ul);

	if (!reviews) {
		var noReviews = document.createElement('p');
		noReviews.id = 'no-reviews';
		noReviews.innerHTML = 'No reviews yet!';
		container.insertBefore(noReviews, ul);
	} else {
		reviews.forEach(function (review) {
			ul.appendChild(createReviewHTML(review));
		});
		container.appendChild(ul);
	}
};

/**
 * Create review HTML and add it to the webpage.
 */
var createReviewHTML = function createReviewHTML(review) {
	var li = document.createElement('li');
	var name = document.createElement('p');
	name.classList.add('review-header');
	name.innerHTML = review.name;
	li.appendChild(name);

	var timestamp = document.createElement('p');
	timestamp.classList.add('review-header');
	var createdAtTimestamp = new Date(review.createdAt);
	var updatedAtTimestamp = new Date(review.updatedAt);
	if (createdAtTimestamp === updatedAtTimestamp) {
		timestamp.innerHTML = createdAtTimestamp.toLocaleString();
	} else {
		timestamp.innerHTML = updatedAtTimestamp.toLocaleString();
	}
	li.appendChild(timestamp);

	var rating = document.createElement('div');
	rating.classList.add('review-rating');
	if (review.rating > 1) {
		rating.title = review.rating + ' stars';
		rating.setAttribute('aria-label', review.rating + ' stars');
	} else {
		rating.title = review.rating + ' star';
		rating.setAttribute('aria-label', review.rating + ' star');
	}
	rating.innerHTML = review.rating + ' <i class="fas fa-star"></i>';
	li.appendChild(rating);

	var comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
var fillBreadcrumb = function fillBreadcrumb() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	var breadcrumb = document.getElementById('breadcrumb');
	var li = document.createElement('li');
	li.innerHTML = restaurant.name;

	//Set ARIA attributes so screenreader knows its on the current page for the restaurant in the breadcrumb trail.
	li.setAttribute('aria-label', restaurant.name);
	li.setAttribute('aria-describedby', 'breadcrumb-description');
	li.setAttribute('tabindex', '0');

	//Dynamically set title attribute
	li.title = restaurant.name;
	breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
var getParameterByName = function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
	    results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Add marker for current restaurant to the map.
 */
var addMarkerToMap = function addMarkerToMap() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	// Add marker to the map
	var marker = DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
	google.maps.event.addListener(marker, 'click', function () {
		window.location.href = marker.url;
	});
};
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlc3RhdXJhbnRfaW5mby5qcyJdLCJuYW1lcyI6WyJyZXN0YXVyYW50IiwibWFwIiwibGl2ZU1hcCIsImluaXRMb2FkIiwid2luZG93IiwiaW5pdE1hcCIsImZldGNoUmVzdGF1cmFudEZyb21VUkwiLCJlcnJvciIsImNvbnNvbGUiLCJmaWxsQnJlYWRjcnVtYiIsImNhbGxiYWNrIiwic2VsZiIsImlkIiwiZ2V0UGFyYW1ldGVyQnlOYW1lIiwiREJIZWxwZXIiLCJmZXRjaFJlc3RhdXJhbnRCeUlkIiwiZmlsbFJlc3RhdXJhbnRIVE1MIiwiZ2V0TGl2ZU1hcCIsInN0YXRpY01hcEltZyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJwYXJlbnROb2RlIiwicmVtb3ZlQ2hpbGQiLCJnb29nbGUiLCJtYXBzIiwiTWFwIiwiem9vbSIsImNlbnRlciIsImxhdGxuZyIsInNjcm9sbHdoZWVsIiwiYWRkTWFya2VyVG9NYXAiLCJzdGF0aWNNYXAiLCJzdGF0aWNJbWFnZUZvck1hcFJlc3RhdXJhbnRJbmZvIiwiY3JlYXRlRWxlbWVudCIsImFsdCIsInN0eWxlIiwid2lkdGgiLCJjbGllbnRXaWR0aCIsImhlaWdodCIsImNsaWVudEhlaWdodCIsInNyYyIsImFkZEV2ZW50TGlzdGVuZXIiLCJhcHBlbmRDaGlsZCIsIm5hbWUiLCJpbm5lckhUTUwiLCJhZGRyZXNzIiwiZmF2b3JpdGUiLCJpc19mYXZvcml0ZSIsImNsYXNzTmFtZSIsImltYWdlIiwic2V0QXR0cmlidXRlIiwic21hbGxJbWFnZVVybEZvclJlc3RhdXJhbnQiLCJsYXJnZUltYWdlVXJsRm9yUmVzdGF1cmFudCIsInRpdGxlIiwibmVpZ2hib3Job29kIiwiY3Vpc2luZV90eXBlIiwiY3Vpc2luZSIsIm9wZXJhdGluZ19ob3VycyIsImZpbGxSZXN0YXVyYW50SG91cnNIVE1MIiwiZmV0Y2hSZXZpZXdzQnlJZCIsImZpbGxSZXZpZXdzSFRNTCIsIm9wZXJhdGluZ0hvdXJzIiwiaG91cnMiLCJrZXkiLCJyb3ciLCJkYXkiLCJ0aW1lIiwicmV2aWV3cyIsImxvZyIsImNvbnRhaW5lciIsInVsIiwiaW5zZXJ0QmVmb3JlIiwibm9SZXZpZXdzIiwiZm9yRWFjaCIsImNyZWF0ZVJldmlld0hUTUwiLCJyZXZpZXciLCJsaSIsImNsYXNzTGlzdCIsImFkZCIsInRpbWVzdGFtcCIsImNyZWF0ZWRBdFRpbWVzdGFtcCIsIkRhdGUiLCJjcmVhdGVkQXQiLCJ1cGRhdGVkQXRUaW1lc3RhbXAiLCJ1cGRhdGVkQXQiLCJ0b0xvY2FsZVN0cmluZyIsInJhdGluZyIsImNvbW1lbnRzIiwiYnJlYWRjcnVtYiIsInVybCIsImxvY2F0aW9uIiwiaHJlZiIsInJlcGxhY2UiLCJyZWdleCIsIlJlZ0V4cCIsInJlc3VsdHMiLCJleGVjIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibWFya2VyIiwibWFwTWFya2VyRm9yUmVzdGF1cmFudCIsImV2ZW50IiwiYWRkTGlzdGVuZXIiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsbUJBQUo7QUFDQSxJQUFJQyxZQUFKO0FBQ0EsSUFBSUMsVUFBVSxLQUFkO0FBQ0EsSUFBSUMsV0FBVyxJQUFmOztBQUVBOzs7QUFHQUMsT0FBT0MsT0FBUCxHQUFpQixZQUFNO0FBQ3RCQyx3QkFBdUIsVUFBQ0MsS0FBRCxFQUFRUCxVQUFSLEVBQXVCO0FBQzdDLE1BQUlPLEtBQUosRUFBVztBQUNWO0FBQ0FDLFdBQVFELEtBQVIsQ0FBY0EsS0FBZCxFQUFxQlAsVUFBckI7QUFDQSxHQUhELE1BR087QUFDTlM7QUFDQTtBQUNELEVBUEQ7QUFRQSxDQVREOztBQVdBOzs7QUFHQSxJQUFNSCx5QkFBeUIsU0FBekJBLHNCQUF5QixDQUFDSSxRQUFELEVBQWM7QUFDNUMsS0FBSUMsS0FBS1gsVUFBVCxFQUFxQjtBQUNwQjtBQUNBVSxXQUFTLElBQVQsRUFBZUMsS0FBS1gsVUFBcEI7QUFDQTtBQUNBO0FBQ0QsS0FBTVksS0FBS0MsbUJBQW1CLElBQW5CLENBQVg7QUFDQSxLQUFJLENBQUNELEVBQUwsRUFBUztB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d0IsTUFBeEIsQ0FBUDtBQUNBLEtBQU1DLFFBQVEsSUFBSUMsTUFBSixVQUFrQm5ELElBQWxCLHVCQUFkO0FBQUEsS0FDQ29ELFVBQVVGLE1BQU1HLElBQU4sQ0FBV1AsR0FBWCxDQURYO0FBRUEsS0FBSSxDQUFDTSxPQUFMLEVBQ0MsT0FBTyxJQUFQO0FBQ0QsS0FBSSxDQUFDQSxRQUFRLENBQVIsQ0FBTCxFQUNDLE9BQU8sRUFBUDtBQUNELFFBQU9FLG1CQUFtQkYsUUFBUSxDQUFSLEVBQVdILE9BQVgsQ0FBbUIsS0FBbkIsRUFBMEIsR0FBMUIsQ0FBbkIsQ0FBUDtBQUNBLENBWEQ7O0FBYUE7OztBQUdBLElBQU05RCxpQkFBaUIsU0FBakJBLGNBQWlCLEdBQWtDO0FBQUEsS0FBakM5QixVQUFpQyx1RUFBcEJXLEtBQUtYLFVBQWU7O0FBQ3hEO0FBQ0EsS0FBTWtHLFNBQVNwRixTQUFTcUYsc0JBQVQsQ0FBZ0N4RixLQUFLWCxVQUFyQyxFQUFpRFcsS0FBS1YsR0FBdEQsQ0FBZjtBQUNBc0IsUUFBT0MsSUFBUCxDQUFZNEUsS0FBWixDQUFrQkMsV0FBbEIsQ0FBOEJILE1BQTlCLEVBQXNDLE9BQXRDLEVBQStDLFlBQU07QUFDcEQ5RixTQUFPc0YsUUFBUCxDQUFnQkMsSUFBaEIsR0FBdUJPLE9BQU9ULEdBQTlCO0FBQ0EsRUFGRDtBQUdBLENBTkQiLCJmaWxlIjoicmVzdGF1cmFudF9pbmZvLmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IHJlc3RhdXJhbnQ7XG5sZXQgbWFwO1xubGV0IGxpdmVNYXAgPSBmYWxzZTtcbmxldCBpbml0TG9hZCA9IHRydWU7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBHb29nbGUgbWFwLCBjYWxsZWQgZnJvbSBIVE1MLlxuICovXG53aW5kb3cuaW5pdE1hcCA9ICgpID0+IHtcblx0ZmV0Y2hSZXN0YXVyYW50RnJvbVVSTCgoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcblx0XHRpZiAoZXJyb3IpIHsgXG5cdFx0XHQvLyBHb3QgYW4gZXJyb3IhXG5cdFx0XHRjb25zb2xlLmVycm9yKGVycm9yLCByZXN0YXVyYW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsbEJyZWFkY3J1bWIoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuLyoqXG4gKiBHZXQgY3VycmVudCByZXN0YXVyYW50IGZyb20gcGFnZSBVUkwuXG4gKi9cbmNvbnN0IGZldGNoUmVzdGF1cmFudEZyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcblx0aWYgKHNlbGYucmVzdGF1cmFudCkgeyBcblx0XHQvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcblx0XHRjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpO1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcblx0aWYgKCFpZCkgeyBcblx0XHQvLyBubyBpZCBmb3VuZCBpbiBVUkxcblx0XHRlcnJvciA9ICdObyByZXN0YXVyYW50IGlkIGluIFVSTCc7XG5cdFx0Y2FsbGJhY2soZXJyb3IsIG51bGwpO1xuXHR9IGVsc2Uge1xuXHRcdERCSGVscGVyLmZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xuXHRcdFx0c2VsZi5yZXN0YXVyYW50ID0gcmVzdGF1cmFudDtcblx0XHRcdGlmICghcmVzdGF1cmFudCkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0ZmlsbFJlc3RhdXJhbnRIVE1MKCk7XG5cdFx0XHRjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcblx0XHR9KTtcblx0fVxufTtcblxuLyoqXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2VcbiAqL1xuXG4vKiBJZiBhIGxpdmUgbWFwIGlzbid0IGFscmVhZHkgZW5hYmxlZCwgcmVtb3ZlcyB0aGUgc3RhdGljIG1hcCBpbWFnZSBhbmQgcmVwbGFjZXMgaXQgd2l0aCBhIGxpdmUgR29vZ2xlIE1hcC4gKi9cbmNvbnN0IGdldExpdmVNYXAgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuXHRpZihsaXZlTWFwKXtcblx0XHRyZXR1cm47XG5cdH0gZWxzZSB7XG5cdFx0Y29uc3Qgc3RhdGljTWFwSW1nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXRpYy1tYXAtaW1nJyk7XG5cdFx0c3RhdGljTWFwSW1nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3RhdGljTWFwSW1nKTtcblx0XHRzZWxmLm1hcCA9IG5ldyBnb29nbGVcblx0XHRcdC5tYXBzXG5cdFx0XHQuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwge1xuXHRcdFx0XHR6b29tOiAxNixcblx0XHRcdFx0Y2VudGVyOiBzZWxmLnJlc3RhdXJhbnQubGF0bG5nLFxuXHRcdFx0XHRzY3JvbGx3aGVlbDogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdGFkZE1hcmtlclRvTWFwKCk7XG5cdFx0bGl2ZU1hcCA9IHRydWU7XG5cdH1cbn07XG5cbmNvbnN0IGZpbGxSZXN0YXVyYW50SFRNTCA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XG5cdC8qIExvYWRzIGEgc3RhdGljIG1hcCBpbWFnZSBpZiBpdCdzIHRoZSBpbml0aWFsIHBhZ2UgbG9hZC4gQWRkcyBhIGNsaWNrIGV2ZW50IGxpc3RlbmVyIHNvIHRoYXQgd2hlbiB0aGUgdXNlciBjbGlja3Mgb24gdGhlIG1hcCwgaXQgcmVtb3ZlcyB0aGUgc3RhdGljIG1hcCBpbWFnZSBhbmQgbG9hZHMgYSBsaXZlIG1hcCBpbiBpdHMgcGxhY2UuICovXG5cdGlmIChpbml0TG9hZCl7XG5cdFx0Y29uc3Qgc3RhdGljTWFwID0gREJIZWxwZXIuc3RhdGljSW1hZ2VGb3JNYXBSZXN0YXVyYW50SW5mbyhzZWxmLnJlc3RhdXJhbnQpO1xuXHRcdGNvbnN0IG1hcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKTtcblx0XHRjb25zdCBzdGF0aWNNYXBJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHRzdGF0aWNNYXBJbWcuaWQgPSAnc3RhdGljLW1hcC1pbWcnO1xuXHRcdHN0YXRpY01hcEltZy5hbHQgPSAnU3RhdGljIEdvb2dsZSBNYXBzIGltYWdlJztcblx0XHRzdGF0aWNNYXBJbWcuc3R5bGUud2lkdGggPSBgJHttYXAuY2xpZW50V2lkdGh9cHhgO1xuXHRcdHN0YXRpY01hcEltZy5zdHlsZS5oZWlnaHQgPSBgJHttYXAuY2xpZW50SGVpZ2h0fXB4YDtcblx0XHRzdGF0aWNNYXBJbWcuc3JjID0gc3RhdGljTWFwO1xuXHRcdHN0YXRpY01hcEltZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGdldExpdmVNYXAoc2VsZi5yZXN0YXVyYW50KTtcblx0XHR9KTtcblx0XHRtYXAuYXBwZW5kQ2hpbGQoc3RhdGljTWFwSW1nKTtcblx0XHRpbml0TG9hZCA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdGFkZE1hcmtlclRvTWFwKCk7XG5cdH1cblx0Y29uc3QgbmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LW5hbWUnKTtcblx0bmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG5cblx0Y29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWFkZHJlc3MnKTtcblx0YWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XG5cblx0Ly9DcmVhdGUgZHluYW1pYyBmYXZvcml0ZSBidXR0b25cblx0Y29uc3QgZmF2b3JpdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmF2b3JpdGUtYnV0dG9uJyk7XG5cdGlmIChyZXN0YXVyYW50LmlzX2Zhdm9yaXRlID09PSB0cnVlKXtcblx0XHRmYXZvcml0ZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1mYXZvcml0ZS10cnVlJztcblx0XHRmYXZvcml0ZS5pbm5lckhUTUwgPSAnPGkgY2xhc3M9XCJmYXMgZmEtaGVhcnRcIj48L2k+Jztcblx0fSBlbHNlIHtcblx0XHRmYXZvcml0ZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1mYXZvcml0ZS1mYWxzZSc7XG5cdFx0ZmF2b3JpdGUuaW5uZXJIVE1MID0gJzxpIGNsYXNzPVwiZmFyIGZhLWhlYXJ0XCI+PC9pPic7XG5cdH1cblxuXHQvKiBMYXp5IGxvYWRzIHNtYWxsIG9yIGxhcmdlIHZlcnNpb24gb2YgcmVzdGF1cmFudCBpbWFnZSBiYXNlZCBvbiBkYXRhLXNyY3NldCBhbmQgYXV0byBkYXRhLXNpemVzLiBBbHNvIGR5bmFtaWNhbGx5IHNldHMgYWx0IGFuZCB0aXRsZSB0ZXh0IG9mIHRoZSBpbWFnZS4gKi9cblx0Y29uc3QgaW1hZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1pbWcnKTtcblx0aW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nIGxhenlsb2FkJztcblx0aW1hZ2Uuc2V0QXR0cmlidXRlKCdkYXRhLXNyYycsIGAke0RCSGVscGVyLnNtYWxsSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA0MDB3YCk7XG5cdGltYWdlLnNldEF0dHJpYnV0ZSgnZGF0YS1zcmNzZXQnLGAke0RCSGVscGVyLnNtYWxsSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA0MDB3LCAke0RCSGVscGVyLmxhcmdlSW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpfSA4MDB3YCk7XG5cdGltYWdlLnNldEF0dHJpYnV0ZSgnZGF0YS1zaXplcycsICdhdXRvJyk7XG5cdGltYWdlLnRpdGxlID0gYCR7cmVzdGF1cmFudC5uYW1lfWA7XG5cdGltYWdlLmFsdCA9IGAke3Jlc3RhdXJhbnQubmFtZX0gaW4gJHtyZXN0YXVyYW50Lm5laWdoYm9yaG9vZH0gLSAke3Jlc3RhdXJhbnQuY3Vpc2luZV90eXBlfSByZXN0YXVyYW50YDtcblxuXHRjb25zdCBjdWlzaW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtY3Vpc2luZScpO1xuXHRjdWlzaW5lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlO1xuXG5cdC8vIGZpbGwgb3BlcmF0aW5nIGhvdXJzXG5cdGlmIChyZXN0YXVyYW50Lm9wZXJhdGluZ19ob3Vycykge1xuXHRcdGZpbGxSZXN0YXVyYW50SG91cnNIVE1MKCk7XG5cdH1cblx0Ly8gZmlsbCByZXZpZXdzXG5cdERCSGVscGVyLmZldGNoUmV2aWV3c0J5SWQocmVzdGF1cmFudC5pZCwgZmlsbFJldmlld3NIVE1MKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIHJlc3RhdXJhbnQgb3BlcmF0aW5nIGhvdXJzIEhUTUwgdGFibGUgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cbiAqL1xuY29uc3QgZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwgPSAob3BlcmF0aW5nSG91cnMgPSBzZWxmLnJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSA9PiB7XG5cdGNvbnN0IGhvdXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaG91cnMnKTtcblx0Zm9yIChsZXQga2V5IGluIG9wZXJhdGluZ0hvdXJzKSB7XG5cdFx0Y29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcblx0XHRjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuXHRcdGRheS5pbm5lckhUTUwgPSBrZXk7XG5cdFx0cm93LmFwcGVuZENoaWxkKGRheSk7XG5cdFx0Y29uc3QgdGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG5cdFx0dGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldO1xuXHRcdHJvdy5hcHBlbmRDaGlsZCh0aW1lKTtcblx0XHRob3Vycy5hcHBlbmRDaGlsZChyb3cpO1xuXHR9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbGwgcmV2aWV3cyBIVE1MIGFuZCBhZGQgdGhlbSB0byB0aGUgd2VicGFnZS5cbiAqL1xuY29uc3QgZmlsbFJldmlld3NIVE1MID0gKGVycm9yLCByZXZpZXdzKSA9PiB7XG5cdGlmKGVycm9yKXtcblx0XHRjb25zb2xlLmxvZyhlcnJvcik7XG5cdH1cblx0c2VsZi5yZXN0YXVyYW50LnJldmlld3MgPSByZXZpZXdzO1xuXHRjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1jb250YWluZXInKTtcblx0Y29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XG5cblx0Y29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMicpO1xuXHR0aXRsZS5pbm5lckhUTUwgPSAnUmV2aWV3cyc7XG5cdGNvbnRhaW5lci5pbnNlcnRCZWZvcmUodGl0bGUsIHVsKTtcblxuXHRpZiAoIXJldmlld3MpIHtcblx0XHRjb25zdCBub1Jldmlld3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0bm9SZXZpZXdzLmlkID0gJ25vLXJldmlld3MnO1xuXHRcdG5vUmV2aWV3cy5pbm5lckhUTUwgPSAnTm8gcmV2aWV3cyB5ZXQhJztcblx0XHRjb250YWluZXIuaW5zZXJ0QmVmb3JlKG5vUmV2aWV3cywgdWwpO1xuXHR9IGVsc2Uge1xuXHRcdHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xuXHRcdFx0dWwuYXBwZW5kQ2hpbGQoY3JlYXRlUmV2aWV3SFRNTChyZXZpZXcpKTtcblx0XHR9KTtcblx0XHRjb250YWluZXIuYXBwZW5kQ2hpbGQodWwpO1xuXHR9XG59O1xuXG4vKipcbiAqIENyZWF0ZSByZXZpZXcgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxuICovXG5jb25zdCBjcmVhdGVSZXZpZXdIVE1MID0gKHJldmlldykgPT4ge1xuXHRjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cdGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdG5hbWUuY2xhc3NMaXN0LmFkZCgncmV2aWV3LWhlYWRlcicpO1xuXHRuYW1lLmlubmVySFRNTCA9IHJldmlldy5uYW1lO1xuXHRsaS5hcHBlbmRDaGlsZChuYW1lKTtcblxuXHRjb25zdCB0aW1lc3RhbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdHRpbWVzdGFtcC5jbGFzc0xpc3QuYWRkKCdyZXZpZXctaGVhZGVyJyk7XG5cdGNvbnN0IGNyZWF0ZWRBdFRpbWVzdGFtcCA9IG5ldyBEYXRlKHJldmlldy5jcmVhdGVkQXQpO1xuXHRjb25zdCB1cGRhdGVkQXRUaW1lc3RhbXAgPSBuZXcgRGF0ZShyZXZpZXcudXBkYXRlZEF0KTtcblx0aWYgKGNyZWF0ZWRBdFRpbWVzdGFtcCA9PT0gdXBkYXRlZEF0VGltZXN0YW1wKXtcblx0XHR0aW1lc3RhbXAuaW5uZXJIVE1MID0gY3JlYXRlZEF0VGltZXN0YW1wLnRvTG9jYWxlU3RyaW5nKCk7XG5cdH0gZWxzZSB7XG5cdFx0dGltZXN0YW1wLmlubmVySFRNTCA9IHVwZGF0ZWRBdFRpbWVzdGFtcC50b0xvY2FsZVN0cmluZygpO1xuXHR9XG5cdGxpLmFwcGVuZENoaWxkKHRpbWVzdGFtcCk7XG5cblx0Y29uc3QgcmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdHJhdGluZy5jbGFzc0xpc3QuYWRkKCdyZXZpZXctcmF0aW5nJyk7XG5cdGlmIChyZXZpZXcucmF0aW5nID4gMSl7XG5cdFx0cmF0aW5nLnRpdGxlID0gYCR7cmV2aWV3LnJhdGluZ30gc3RhcnNgO1xuXHRcdHJhdGluZy5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCBgJHtyZXZpZXcucmF0aW5nfSBzdGFyc2ApO1xuXHR9IGVsc2Uge1xuXHRcdHJhdGluZy50aXRsZSA9IGAke3Jldmlldy5yYXRpbmd9IHN0YXJgO1xuXHRcdHJhdGluZy5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCBgJHtyZXZpZXcucmF0aW5nfSBzdGFyYCk7XG5cdH1cblx0cmF0aW5nLmlubmVySFRNTCA9IGAke3Jldmlldy5yYXRpbmd9IDxpIGNsYXNzPVwiZmFzIGZhLXN0YXJcIj48L2k+YDtcblx0bGkuYXBwZW5kQ2hpbGQocmF0aW5nKTtcblxuXHRjb25zdCBjb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0Y29tbWVudHMuaW5uZXJIVE1MID0gcmV2aWV3LmNvbW1lbnRzO1xuXHRsaS5hcHBlbmRDaGlsZChjb21tZW50cyk7XG5cblx0cmV0dXJuIGxpO1xufTtcblxuLyoqXG4gKiBBZGQgcmVzdGF1cmFudCBuYW1lIHRvIHRoZSBicmVhZGNydW1iIG5hdmlnYXRpb24gbWVudVxuICovXG5jb25zdCBmaWxsQnJlYWRjcnVtYiA9IChyZXN0YXVyYW50PXNlbGYucmVzdGF1cmFudCkgPT4ge1xuXHRjb25zdCBicmVhZGNydW1iID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JyZWFkY3J1bWInKTtcblx0Y29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXHRsaS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG5cblx0Ly9TZXQgQVJJQSBhdHRyaWJ1dGVzIHNvIHNjcmVlbnJlYWRlciBrbm93cyBpdHMgb24gdGhlIGN1cnJlbnQgcGFnZSBmb3IgdGhlIHJlc3RhdXJhbnQgaW4gdGhlIGJyZWFkY3J1bWIgdHJhaWwuXG5cdGxpLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIHJlc3RhdXJhbnQubmFtZSk7XG5cdGxpLnNldEF0dHJpYnV0ZSgnYXJpYS1kZXNjcmliZWRieScsICdicmVhZGNydW1iLWRlc2NyaXB0aW9uJyk7XG5cdGxpLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXG5cdC8vRHluYW1pY2FsbHkgc2V0IHRpdGxlIGF0dHJpYnV0ZVxuXHRsaS50aXRsZSA9IHJlc3RhdXJhbnQubmFtZTtcblx0YnJlYWRjcnVtYi5hcHBlbmRDaGlsZChsaSk7XG59O1xuXG4vKipcbiAqIEdldCBhIHBhcmFtZXRlciBieSBuYW1lIGZyb20gcGFnZSBVUkwuXG4gKi9cbmNvbnN0IGdldFBhcmFtZXRlckJ5TmFtZSA9IChuYW1lLCB1cmwpID0+IHtcblx0aWYgKCF1cmwpXG5cdFx0dXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cdG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtcXF1dL2csICdcXFxcJCYnKTtcblx0Y29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBbPyZdJHtuYW1lfSg9KFteJiNdKil8JnwjfCQpYCksXG5cdFx0cmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcblx0aWYgKCFyZXN1bHRzKVxuXHRcdHJldHVybiBudWxsO1xuXHRpZiAoIXJlc3VsdHNbMl0pXG5cdFx0cmV0dXJuICcnO1xuXHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csICcgJykpO1xufTtcblxuLyoqXG4gKiBBZGQgbWFya2VyIGZvciBjdXJyZW50IHJlc3RhdXJhbnQgdG8gdGhlIG1hcC5cbiAqL1xuY29uc3QgYWRkTWFya2VyVG9NYXAgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuXHQvLyBBZGQgbWFya2VyIHRvIHRoZSBtYXBcblx0Y29uc3QgbWFya2VyID0gREJIZWxwZXIubWFwTWFya2VyRm9yUmVzdGF1cmFudChzZWxmLnJlc3RhdXJhbnQsIHNlbGYubWFwKTtcblx0Z29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIobWFya2VyLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSBtYXJrZXIudXJsO1xuXHR9KTtcbn07Il19
