var data = {}
var admin = false;
var firstLoad = true;
var map, geocoder, infoWindow, directionService;
var speed = 0;
var newRide = false;
var station = false;
var left = true;
var ridekey = "";
var ride = {
    stations: []
}
var dbRoute = "busses/";

var newPosIcon = {
    fillColor: '#f55',
    fillOpacity: 0.7,
    strokeColor: '#665',
    strokeOpacity: 1,
    strokeWeight: 2,
    scale: 6
}
var stationIcon = {
    fillColor: '#33f',
    fillOpacity: 1,
    strokeColor: '#000',
    strokeOpacity: 1,
    strokeWeight: 5,
    scale: 5
}
var currentPosIcon = {
    fillColor: '#fff',
    fillOpacity: 1,
    strokeColor: '#000',
    strokeOpacity: 1,
    strokeWeight: 5,
    scale: 7
}
var app = {
    markers: [],
    mapLabel: null,
    options: { 
        
    },
    init: () => {
        alertify.defaults.theme.ok = "btn btn-outline-success";
        alertify.defaults.theme.cancel = "btn btn-outline-danger";

        $("#left").attr("disabled", "disabled");
        $("#admin").hide();
        app.sidebarStuff();
        app.id("delete").addEventListener("click", app.deleteWarning);
        $(".b").on("click", app.checkBusId);
        $("#admin-icon").on('click', app.adminLogin);
    },
    sidebarStuff: () => {
        $('#sidebarCollapse').on('click', function () {
            $('#sidebar').toggleClass('active');
            $("#menu").hide();
            if($("#sidebar").hasClass('active')) {
                $(".wrapper").css("z-index", '20')
                app.id("menu").src = "res/svg/si-glyph-arrow-left.svg";
                $("#menu").fadeIn("slow");
            } else {
                $(".wrapper").css("z-index", '1')
                app.id("menu").src = "res/svg/si-glyph-arrow-right.svg";
                $("#menu").fadeIn("slow");
            }
            $('.collapse.in').toggleClass('in');
            $('a[aria-expanded=true]').attr('aria-expanded', 'false');
        });
    },
    adminLogin: () => {
        let f = () => {
            alertify.error("Discarded", 2);
        }
        if(admin){
            alertify.confirm(null, function () {
                admin = false;
                $("#admin").fadeOut();
                $("#admin-img").css('background', '#faa');
                alertify.success("Logged out", 2)
            }, f).set({ 
                'labels': { ok: 'Yes', cancel: 'No' }, 
                'title': "<span style='font-size:15px;'>Logout?</span>", 
                'resizable': true 
            }).resizeTo('90%', 150);
        } else {
            alertify.prompt('Admin password:').set({
                'onok': function(e, data) { 
                    if(data == "j@keLozinke") {
                        admin = true;
                        $("#admin").fadeIn();
                        $("#admin-img").css('background', '#afa');
                        alertify.success('Logged in as Admin O.o', 5)
                    } else {
                        alertify.error('Wrong Password', 2)
                    }
                }, 
                'oncancel': f, 
                'onexit': f, 
                'type': 'text', 
                'title': 'Login',
                'resizable': true
            }).resizeTo('90%', 250);
        }
    },
    id: (id) => {
        return document.getElementById(id);
    },
    class: (cl) => {
        return document.getElementsByClassName(cl);
    },
    initMap: () => {
        let pentagon = { lat: 38.8719, lng: -77.0563 }
        map = new google.maps.Map(app.id('map'), {
            zoom: 16,
            center: pentagon,
            disableDefaultUI: true,
        });

        directionsService = new google.maps.DirectionsService();
        geocoder = new google.maps.Geocoder;
        infoWindow = new google.maps.InfoWindow();
        app.myLocation();
    },
    myLocation: () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.onSuccess, app.onError, app.options);
        } else {
            $("#loader").remove();
            $("body").innerHTML = "Geolocation is not supported by this browser."
        }
    },
    onSuccess: (position) => {
        app.hasLoaded();
        app.markPosition(position.coords)
    },
    hasLoaded: () => {
        $("#all").css('display', 'block');
        $("#loader").css('display', 'none');
    },
    onError: () => {
        $(".b").button("reset");
        app.ipApiLocation();
    },
    ipApiLocation: () => {
        $.getJSON("http://ip-api.com/json", callback).fail(error => {
            $("a").removeClass("is-loading");
            alert("Error:", error)
        });
        function callback(data) {
            let obj = {
                coords: {
                    latitude: data.lat,
                    longitude: data.lon,
                },
                timestamp: +Date.now()
            }
            app.markPosition(obj.coords);
            app.onLocSuccess(obj);
        }
        app.hasLoaded();
    },
    processButtons: (btnID, busID) => {
        $("#" + btnID).button("loading");
        if (btnID == "entered") {
            alertify.confirm(null, function () {
                newRide = true;
                left = false;
                $("#" + btnID).attr("disabled", "disabled");
                $("#left").removeAttr("disabled")
                alertify.success('Ride started', 2);
                app.makeRoute(busID)
                app.sendLocation();
            }, function () {
                alertify.error('Discarded', 2);
            }).set({ labels: { ok: 'Yes', cancel: 'Cancel' }, title: "<span style='font-size:15px;'>Start a ride?</span>", 'resizable': true }).resizeTo('90%', 150);

        } else if (btnID == "left") {
            alertify.confirm(null, function () {
                $("#entered").removeAttr("disabled")
                $("#" + btnID).attr("disabled", "disabled");
                left = true;
                alertify.error('Ride ended', 2);
                app.makeRoute(busID)
                app.sendLocation();
            }, function () {
                alertify.error('Discarded', 2);
            }).set({ labels: { ok: 'Yes', cancel: 'Cancel' }, title: "<span style='font-size:15px;'>End a ride?</span>", 'resizable': true }).resizeTo('90%', 150);
        } else if (btnID == "all-stations") {
            app.loadStationsFromDb(busID);
        } else {
            alertify.confirm(null, function () {
                left = false;
                app.makeRoute(busID)
                app.sendLocation();
            }, function () {
                alertify.error('Discarded', 2);
            }).set({
                labels: { ok: "Yes", cancel: 'Cancel' },
                title: "<span style='font-size:15px;'>Mark this station?</span>", 'resizable': true
            }).resizeTo('80%', 150);
        }
    },
    sendLocation: () => {
        navigator.geolocation.getCurrentPosition(app.onLocSuccess, app.onError, app.options);
    },
    checkBusId: (e) => {
        firstLoad = false;
        let btnID = e.target.id;
        let busID = app.id('busNumber').value;
        if (busID == "" || parseInt(busID) <= 0) {
            alertify.alert(null).set({
                'title': "<span style='font-size:15px;'>Invalid bus number</span>", 'resizable': true
            }).resizeTo('80%', 150);
            return;
        } else {
            app.processButtons(btnID, busID);
        }
    },
    makeRoute: (busID) => {
        dbRoute = "busses/" + busID;
        if (newRide) {
            dbRoute += "/ride";
        } else {
            dbRoute += "/seen";
        }
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
                lat: lat,
                lng: lon
            }
        }
        app.markPosition(position.coords)
        if (ride.stations.length == 1) {
            ride.stations.push(ride_obj)
            //app.drawPath()
            speed = app.travelSpeed(ride.stations)
        } else if (ride.stations.length > 1) {
            ride.stations.shift()
        } else {
            ride.stations.push(ride_obj)
        }
        //li.innerHTML = 'Latitude: ' + lat + '<br />' +
        //    'Longitude: ' + lon + '<br />Speed: ' + speed + '<br />' +
        //    'Timestamp: ' + new Date(position.timestamp).toISOString() + '<br />';
        // app.id("locations").prepend(li);
        data = {
            "busID": busID,
            "lat": lat,
            "lng": lon,
            "timestamp": position.timestamp
        }
        $(".b").button("reset");
        if (!firstLoad) {
            app.addToDb(data)
        }
    },
    insertIntoLS: (key, data) => {
        d = JSON.parse(localStorage.getItem(key));
        d.push(data);
        localStorage.setItem(key, d);
    },
    addToDb: (data) => {
        alertify.confirm(null, function () {
            var ref = firebase.database().ref(dbRoute);
            if (left) {
                var station = ref.child(ridekey + "/arrivals").push() // use old ridekey
                ridekey = "";
                newRide = false;
            }
            else if (newRide) {
                if (ridekey == "") {
                    ridekey = ref.push().key; // make new ride entry
                }
                var station = ref.child(ridekey + "/arrivals").push()
            } else {
                var station = ref.child("arrivals").push()
            }
            station.set(data, function (error) {
                if (error) {
                    alertify.error("Couldn't save to DB", 2);
                }
                else {
                    alertify.success('Position saved into DB', 2);
                }
            });
        }, function () {
            alertify.error('Discarded', 2);
        }).set({ resizable: true, labels: { ok: 'Yes', cancel: 'Cancel' }, title: "<span style='font-size:15px;'>Store it into DB?</span>" }).resizeTo('90%', 150);
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
        newPosIcon["path"] = google.maps.SymbolPath.CIRCLE;
        currentPosIcon["path"] = google.maps.SymbolPath.CIRCLE;
        let ico;
        if (!firstLoad) {
            ico = newPosIcon;
        } else {
            ico = currentPosIcon;
        }
        var marker = new google.maps.Marker({
            position: loc,
            map: map,
            icon: ico,
        });
        map.panTo(loc)
        app.getLocationAddress(loc, marker);
    },
    getLocationAddress: (coords, marker) => {
        let lat = coords.lat;
        let lng = coords.lng;
        let content = "Unknown"
        let url = `https://nominatim.openstreetmap.org/reverse.php?format=json&lat=${lat}&lon=${lng}`
        $.getJSON(url, function (data) {
            let num = data["address"]["house_number"] ? data["address"]["house_number"] : ""
            content = data["address"]["road"] + " " + num
        }).fail(function (error) {
            content = "Unknown"
        }).always(function () {
            marker.addListener('click', function () {
                infoWindow.setContent(content);
                infoWindow.setOptions({ maxWidth: 250 });
                infoWindow.open(map, marker);
            });
        });
    },
    drawPath: () => {
        let points = []
        for (let i = 0; i < ride.stations.length; i++) {
            let coords = ride.stations[i].coords
            points.push(coords)
        }
        var polyconnect = new google.maps.Polyline({
            path: points,
            geodesic: true,
            strokeColor: '#00FF00',
            strokeOpacity: 0.8,
            strokeWeight: 10
        });
        polyconnect.setMap(map);
    },
    deleteWarning: () => {
        let el = app.class("notification")[0]
        el.parentNode.removeChild(el);
    },
    geocodeLatLng: (coords) => {
        let latlng = { lat: coords.latitude, lng: coords.longitude }
        //map.panTo(loc)
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    map.setZoom(16);
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
        let r = 6371000;
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
            "latitude": loc[0].coords.lat,
            "longitude": loc[0].coords.lng,
            "timestamp": loc[0].timestamp
        }
        let p2 = {
            "latitude": loc[1].coords.lat,
            "longitude": loc[1].coords.lng,
            "timestamp": loc[1].timestamp
        }

        let dist = app.latLonDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        let time_s = (p2.timestamp - p1.timestamp) / 1000.0;
        let speed_mps = dist / time_s;
        let speed_kph = speed_mps / 3.6;
        return speed_kph
    },
    loadStationsFromDb: (busNo) => {
        let r_name = '';
        app.fetchBusInfo(busNo, function(busses, err) {
            if (err || busses.length < 1) {
                r_name = "No such bus"
            } else {
                for(let i = 0; i < busses.length; i++) {
                    r_name += busses[i]['line_route'] + '<br>'
                }
            }
            console.log(r_name)
            app.showRouteName(r_name);
        });
        
        var locations = [];
        database.ref("stations").once("value", function(snap) {
            snap.forEach(function(val) {
                let linije = val.val()['Linije']
                if(linije) {
                    if(linije.includes(busNo.toString())){
                        locations.push(val.val());
                    }
                }
            });
            app.clearMarkers(app.markers)
            app.setMarkers(locations);
        }, function (err) {
            alertify.alert(null).set({
                'title': "<span style='font-size:15px;'>Something went wrong while fetching stations</span>", 'resizable': true
            }).resizeTo('80%', 150);
        });
   
    },
    fetchBusInfo: (busNo, callback) => {
        database.ref("timetable").orderByChild('line_number').equalTo(busNo).once('value', function(snap) {
            let json_obj = []
            let temp = Object.keys(snap.val());
            for(let i = 0; i < temp.length; i++) {
                let res = snap.val()[temp[i]]
                json_obj.push(res)
            }
            callback(json_obj, null);
        }, function(err) {
            callback(err);
        });
    },
    setMarkers: (locations) => {
        var marker, i;
        app.markers = [];
        stationIcon["path"] = google.maps.SymbolPath.CIRCLE;
        for (i = 0; i < locations.length; i++) {
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(locations[i]['Latitude'], locations[i]['Longitude']),
                map: map,
                icon: stationIcon
            });
            app.markers.push(marker);
            google.maps.event.addListener(marker, 'click', (function (marker, i) {
                return function () {
                    let c = '<p style="font-weight: normal; line-height: normal;"><strong>Station:</strong> ' + 
                        locations[i]['Naziv'] + '<br><strong>Latitude:</strong> ' +  
                        locations[i]['Latitude']  + '<br><strong>Longitude:</strong> ' + 
                        locations[i]['Longitude']  + '</p>'
                    infoWindow.setContent(c);
                    infoWindow.open(map, marker);
                    map.panTo(marker.position)
                }
            })(marker, i));
        }
        app.panToAllMarkers(app.markers);
    },
    panToAllMarkers: (markers) => {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
            bounds.extend(markers[i].getPosition());
        }
        map.fitBounds(bounds);
        map.setZoom(map.getZoom() + 0.3);
    },
    clearMarkers: (markers) => {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
    },
    showRouteName: (str) => {
        app.id('route-name').innerHTML = str;
    }
}