var data = {}
var options = {
    maximumAge: 3000,
    timeout: 5000,
    enableHighAccuracy: true
};
var mymap;
var speed = 0;
var newRide = false;
var ride = {
    stations: []
}
var dbRoute = "busses/";
/* 
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
        app.id("entered").addEventListener("click", app.enteredBus);
        app.id("left").addEventListener("click", app.leftBus);
        app.id("delete").addEventListener("click", app.deleteWarning);
        app.initialLocation();
    },
    id: (id) => {
        return document.getElementById(id);
    },
    class: (cl) => {
        return document.getElementsByClassName(cl);
    },
    initMap: (lat, lng) => {
        mymap = L.map('map').setView([lat, lng], 13);
        mymap.setZoom(17);
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZG9tYWdvanB1bGppYyIsImEiOiJjam92cmJyZmkxbnZkM3dudmU3dTdleXp5In0.vm8YZuizVdTWTY_QBOMxqA', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 20,
            minZoom: 2,
            id: 'mapbox.streets',
            accessToken: 'pk.eyJ1IjoiZG9tYWdvanB1bGppYyIsImEiOiJjam92cmJyZmkxbnZkM3dudmU3dTdleXp5In0.vm8YZuizVdTWTY_QBOMxqA'
        }).addTo(mymap);
        app.markStation(lat, lng);
        app.removeClass("is-loading");
    },
    initialLocation: () => {
        navigator.geolocation.getCurrentPosition(app.onSuccess, app.onError, options);
    },
    onSuccess: (position) => {
        app.initMap(position.coords.latitude, position.coords.longitude)
    },
    onError: () => {
        $(".is-loading").removeClass("is-loading");
        alert("Couldn't fetch location from GPS. Trying over internet..")
        app.fallbackLocation();
    },
    onLocError: (error) => {
        app.fallbackLocation();
    },
    fallbackLocation: () => {
        $.getJSON("http://ip-api.com/json/", function (data) {
            if(mymap) {
                let obj = {
                    coords: {
                        latitude: data.lat,
                        longitude: data.lon,
                    },
                    timestamp: +Date.now()
                }
                console.log(JSON.stringify(obj))
                
               app.onLocSuccess(obj);
            } else {
                app.initMap(data.lat, data.lon)
            }
        }).fail(function (error) { 
            $(".is-loading").removeClass("is-loading");
            alert("Error:" , error) 
        });
    },
    atStation: () => {
        let btn = "station";
        app.sendLocation(btn);
    },
    enteredBus: () => {
        newRide = true;
        $("#entered").attr("disabled", "disabled");
        $("#left").removeAttr("disabled")
        let btn = "entered";
        app.sendLocation(btn);
    },
    leftBus: () => {
        let btn = "left";
        $("#entered").removeAttr("disabled")
        $("#left").attr("disabled", "disabled");
        app.sendLocation(btn);
        newRide = false;
    },
    sendLocation: (btn) => {
        let busID = app.id('busNumber').value;
        if (busID == "" || parseInt(busID) <= 0) {
            alert("Please enter valid bus number")
            return;
        }

        $("#" + btn).removeClass("is-loading");
        $("#" + btn).addClass("is-loading");

        dbRoute = "busses/" + busID;
        if (newRide) {
            dbRoute += "/ride";
        } else {
            dbRoute += "/seen";
        }
        navigator.geolocation.getCurrentPosition(app.onLocSuccess, app.onLocError, options);
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
        let img = document.createElement('img');
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        app.markStation(lat, lon);
        mymap.flyTo([lat, lon])

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
            'Longitude: ' + lon + '<br />' + speed + '<br />' +
            'Timestamp: ' + new Date(position.timestamp).toISOString() + '<br />';
        app.id("locations").prepend(li);

        data = {
            "busID": busID,
            "latitude": lat,
            "longitude": lon,
            "timestamp": position.timestamp
        }
        $(".is-loading").removeClass("is-loading");
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
    markStation: (lat, lng) => {
        var circle = L.circle([lat, lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 5
        }).addTo(mymap);
    },
    drawPath: () => {
        let points = []
        for (let i = 0; i < ride.stations.length; i++) {
            points.push(Object.values(ride.stations[i].coords))
        }
        var polyconnect = new L.Polyline(points, {
            color: 'blue',
            weight: 4,
            opacity: 0.5,
            smoothFactor: 1
        });
        polyconnect.addTo(mymap);
    },
    deleteWarning: () => {
        let el = app.class("notification")[0]
        el.parentNode.removeChild(el);
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