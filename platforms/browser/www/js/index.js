var data = {}
var options = {
    maximumAge: 3000,
    timeout: 5000,
    enableHighAccuracy: true
};
var mymap;
var newRide = false;
var rideCoords = [] //used for drawing polygons
var dbRoute = "busses/";
var fake_data = {
    "busID": "1",
    "latitude": 43.5112668,
    "longitude": 16.4719245,
    "timestamp": "2019-01-19T16:20:42.615Z"
}
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
        return document.getElementsByClassName(cl)[0];
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
        app.markStation(lat, lng).addTo(mymap);
    },
    initialLocation: () => {
        navigator.geolocation.getCurrentPosition(app.onSuccess, app.onLocError, options);
    },
    onSuccess: (position) => {
        app.initMap(position.coords.latitude, position.coords.longitude)
    },
    atStation: () => {
        app.addClass(this.id, "is-loading");
        app.sendLocation();
    },
    sendLocation: () => {
        let busID = app.id('busNumber').value;
        if (busID == "" || parseInt(busID) <= 0) {
            alert("Please enter valid bus number")
            return;
        }
        dbRoute = "busses/" + busID;
        if(newRide) {
            dbRoute.concat("ride/");
        } else {
            dbRoute.concat("junkyard/");
        }
        navigator.geolocation.getCurrentPosition(app.onLocSuccess, app.onLocError, options);
    },
    removeClass: (id, cls_name) => {
        app.id(id).classList.remove(cls_name);
    },
    addClass: (id, cls_name) => {
        app.id(id).classList.add(cls_name);
    },
    onLocSuccess: (position) => {
        let busID = app.id('busNumber').value;
        let li = document.createElement('li');
        let img = document.createElement('img');
        app.markStation(fake_data.latitude, fake_data.longitude);
        mymap.flyTo([fake_data.latitude, fake_data.longitude])
        //app.markStation(position.coords.latitude, position.coords.longitude);
        img.src = "https://maps.googleapis.com/maps/api/staticmap?center=" + position.coords.latitude + ","
            + position.coords.longitude + "&maptype=roadmap&zoom=16&size=150x150&markers=color:red%7C" +
            + position.coords.latitude + "," + position.coords.longitude + "&key=AIzaSyDrd5FUzXQvUXYUrlzp3QiRLmR4utGsz1g"
        li.innerHTML = 'Latitude: ' + position.coords.latitude + '<br />' +
            'Longitude: ' + position.coords.longitude + '<br />' +
            'Accuracy: ' + position.coords.accuracy + '<br />' +
            'Timestamp: ' + new Date(position.timestamp).toISOString() + '<br />';
        li.append(img);
        app.id("locations").prepend(li);
        data = {
            "busID": busID,
            "latitude": position.coords.latitude,
            "longitude": position.coords.longitude,
            "timestamp": position.timestamp
        }
        app.removeClass(this.id, "is-loading");
        app.addToDb(data)
    },
    insertIntoLS: (key, data) => {
        d = JSON.parse(localStorage.getItem(key));
        d.push(data);
        localStorage.setItem(key, d);
    },
    onLocError: (error) => {
        app.removeClass(this.id, "is-loading");
        app.fallbackLocation();
    },
    fallbackLocation: () => {
        $.getJSON("http://ip-api.com/json/", function(data) {
            app.initMap(data.lat, data.lon);
        }).fail(function(error) {alert(error)});
    },
    enteredBus: () => {
        newRide = true;
        app.addClass(this.id, "is-loading");
        app.sendLocation();
    },
    checkBusNumber: (bus) => {
        if (bus == "") {
            return true;
        }
        return false;
    },
    leftBus: async () => {
        app.sendLocation()
        newRide = false;
    },
    addToDb: (data) => {
        console.log(data)
        var ref = firebase.database().ref("busses/" + data.busID);
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

    },
    deleteWarning: () => {
        let el = app.class("notification")
        el.parentNode.removeChild(el);
    }
}