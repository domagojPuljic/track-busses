var data = {}
var option1 = {
    maximumAge: 3000,
    timeout: 5000,
    enableHighAccuracy: true
};
var option2 = {
    maximumAge: 3000,
    timeout: 5000,
    enableHighAccuracy: false
};
var gpsOn = false;
var map, geocoder, infoWindow, directionService;
var speed = 0;
var newRide = false;
var ride = {
    stations: []
}
var dbRoute = "busses/";
/* 
var stationIcon = {
    fillColor: '#f88',
    fillOpacity: 0.5,
    strokeColor: '#a65',
    strokeOpacity: 0.9,
    strokeWeight: 1,
    scale: 0.2
}
var currentPosIcon = {
    fillColor: '#999',
    fillOpacity: 0.3,
    strokeColor: '#000',
    strokeOpacity: 0.8,
    strokeWeight: 1,
    scale: 0.2
}

var fake_data = {
    "busID": "1",
    "latitude": 43.5112668,
    "longitude": 16.4684625,
    "timestamp": "2019-01-19T16:20:42.615Z"
}
var fake_data2 = {
    "busID": "1",
    "latitude": 43.5163179,
    "longitude": 16.4719245,
    "timestamp": "2019-01-19T16:19:35.615Z"
} */
var app = {
    init: () => {
        app.id("station").addEventListener("click", app.atStation);
        $(".b").on("click", app.processButtons)
        app.id("entered").addEventListener("click", app.enteredBus);
        app.id("left").addEventListener("click", app.leftBus);
        app.id("delete").addEventListener("click", app.deleteWarning);
    },
    id: (id) => {
        return document.getElementById(id);
    },
    class: (cl) => {
        return document.getElementsByClassName(cl);
    },
    initMap: () => {
        let pent = { lat: 38.8719, lng: -77.0563 }
        map = new google.maps.Map(app.id('map'), {
            zoom: 15,
            center: pent,
            disableDefaultUI: true,
            fullscreenControl: true
        });
        directionsService = new google.maps.DirectionsService();
        geocoder = new google.maps.Geocoder;
        infoWindow = new google.maps.InfoWindow
        app.myLocation();
    },
    myLocation: () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.onSuccess, app.onError, option1);
        } else {
            $("#loader").remove();
            $("body").innerHTML = "Geolocation is not supported by this browser."
        }
    },
    onSuccess: (position) => {
        gpsOn = true;
        app.hasLoaded();
        app.markPosition(position.coords)
    },
    hasLoaded: () => {
        $("#all").css('display', 'block');
        $("#loader").css('display', 'none');
    },
    onError: () => {
        $(".b").button("reset");
        gpsOn = false;
        app.networkLocation();
    },
    onLocError: (error) => {
        app.networkLocation();
    },
    networkLocation: () => {
        navigator.geolocation.getCurrentPosition(app.onSuccess, app.onError, option2);
    },
    ipApiLocation: () => {
        $.getJSON("http://ip-api.com/json", callback).fail(error => {
            $("a").removeClass("is-loading");
            alert("Error:", error)
        });
        function callback(data) {
            if (map) {
                let obj = {
                    coords: {
                        latitude: data.lat,
                        longitude: data.lon,
                    },
                    timestamp: +Date.now()
                }
                app.markPosition(obj.coords);
            } else {
                app.initMap()
            }
        }
        app.hasLoaded();
    },
    processButtons: () => {
        let id = this.id;
        $("#" + id).button("loading");
        if(id == "entered") {
            newRide = true;
            $(this).attr("disabled", "disabled");
            $("#left").removeAttr("disabled")
        } else if(id == "left") {
            $("#entered").removeAttr("disabled")
            $(this).attr("disabled", "disabled");
            newRide = false;
        }
        app.sendLocation(id);
    },
    sendLocation: (btn) => {
        let busID = app.id('busNumber').value;
        if (busID == "" || parseInt(busID) <= 0) {
            alert("Please enter valid bus number")
            return;
        }
        $("#" + btn).button("loading");

        dbRoute = "busses/" + busID;
        if (newRide) {
            dbRoute += "/ride";
        } else {
            dbRoute += "/seen";
        }
        navigator.geolocation.getCurrentPosition(app.onLocSuccess, app.onLocError, option1);
    },
    removeClass: (cls_name) => {
        let btns = app.class(cls_name);
        for (let i = 0; i < btns.length; i++) {
            btns[i].classList.remove(cls_name);
        }
    },
    addClass: (id, cls_name) => {
        app.id(id).classList.add(cls_name);
    },
    onLocSuccess: (position) => {
        let busID = app.id('busNumber').value;
        let li = document.createElement('li');
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;

        let ride_obj = {
            timestamp: position.timestamp,
            coords: {
                latitude: lat,
                longitude: lon
            }
        }
        if (ride.stations.length == 1) {
            ride.stations.push(ride_obj)
            app.drawPath()
            speed = app.travelSpeed(ride.stations)
        } else if (ride.stations.length > 1) {
            ride.stations.shift()
        } else {
            ride.stations.push(ride_obj)
        }
        alert(JSON.stringify(ride.stations))
        li.innerHTML = 'Latitude: ' + lat + '<br />' +
            'Longitude: ' + lon + '<br />Speed: ' + speed + '<br />' +
            'Timestamp: ' + new Date(position.timestamp).toISOString() + '<br />';
        app.id("locations").prepend(li);

        data = {
            "busID": busID,
            "latitude": lat,
            "longitude": lon,
            "timestamp": position.timestamp
        }
        $("b").button("reset");
        app.addToDb(data)
    },
    insertIntoLS: (key, data) => {
        d = JSON.parse(localStorage.getItem(key));
        d.push(data);
        localStorage.setItem(key, d);
    },
    addToDb: (data) => {
        console.log(data)
        var ref = firebase.database().ref(dbRoute);
        var station = ref.child("arrivals").push()
        station.set(data);
    },
    isOnline: () => {
        var connectedRef = firebase.database().ref(".info/connected");
        connectedRef.on("value", function (snap) {
            if (snap.val() === true) {
                alert("connected");
            } else {
                alert("not connected");
            }
        });
    },
    markPosition: (coords) => {
        let loc = { lat: coords.latitude, lng: coords.longitude }
        map.panTo(loc)

        var marker = new google.maps.Marker({
            size: new google.maps.Size(10, 16),
            position: loc,
            map: map
        });
    },
    drawPath: () => {
        let points = []
        for (let i = 0; i < ride.stations.length; i++) {
            points.push(Object.values(ride.stations[i].coords))
        }
        alert(points)
        var polyconnect = new google.maps.Polyline({
            path: points,
            geodesic: true,
            strokeColor: '#00FF00',
            strokeOpacity: 0.8,
            strokeWeight: 4
        });
        polyconnect.setMap(map);
    },
    deleteWarning: () => {
        let el = app.class("notification")[0]
        el.parentNode.removeChild(el);
    },
    geocodeLatLng: (coords) => {
        let latlng = {lat: coords.latitude, lng: coords.longitude}
        geocoder.geocode({ 'location': latlng }, function(results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    map.setZoom(11);
                    var marker = new google.maps.Marker({
                        position: latlng,
                        map: map
                    });
                    infowindow.setContent(results[0].formatted_address);
                    infowindow.open(map, marker);
                } else {
                    window.alert('No results found');
                }
            } else {
                window.alert('Geocoder failed due to: ' + status);
            }
        });
    },
    latLonDistance: (la1, lo1, la2, lo2) => {
        // Convert degrees to radians
        let lat1 = parseFloat(la1) * Math.PI / 180.0;
        let lon1 = parseFloat(lo1) * Math.PI / 180.0;

        let lat2 = parseFloat(la2) * Math.PI / 180.0;
        let lon2 = parseFloat(lo2) * Math.PI / 180.0;


        // radius of earth in meters
        let r = 6378100;

        // P
        let rho1 = r * Math.cos(lat1);
        let z1 = r * Math.sin(lat1);
        let x1 = rho1 * Math.cos(lon1);
        let y1 = rho1 * Math.sin(lon1);

        // Q
        let rho2 = r * Math.cos(lat2);
        let z2 = r * Math.sin(lat2);
        let x2 = rho2 * Math.cos(lon2);
        let y2 = rho2 * Math.sin(lon2);

        // Dot product
        let dot = (x1 * x2 + y1 * y2 + z1 * z2);
        let cos_theta = dot / (r * r);

        let theta = Math.acos(cos_theta);

        // Distance in Meters
        return r * theta;
    },
    travelSpeed: (loc) => {
        let p1 = {
            "latitude": loc[0].coords.latitude,
            "longitude": loc[0].coords.longitude,
            "timestamp": loc[0].timestamp
        }
        let p2 = {
            "latitude": loc[1].coords.latitude,
            "longitude": loc[1].coords.longitude,
            "timestamp": loc[1].timestamp
        }

        let dist = app.latLonDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        let time_s = (p2.timestamp - p1.timestamp) / 1000.0;
        let speed_mps = dist / time_s;
        let speed_kph = speed_mps / 3.6;
        return speed_kph
    }
}