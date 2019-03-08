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
    stationImg: null,
    slideIndex: 0,
    zoneId: null,
    init: () => {
        document.addEventListener('backbutton', app.backPressed, false); 

        alertify.defaults.transition = "zoom";
        alertify.defaults.theme.ok = "btn btn-outline-success";
        alertify.defaults.theme.cancel = "btn btn-outline-danger";

        $("#left").attr("disabled", "disabled");
        $("#admin").hide();
        app.sidebarStuff();
        $(".b").on("click", app.checkBusId);
        app.listAllBusNames()
        $("#pageSubmenu a, .ui-content a").on("click", app.fetchRoutesByZone);
        $("#admin-icon").on('click', app.adminLogin);
        
        app.carousel();
        $(".ui-content, #main-page, #map-page").on('click', function(){
            app.removeActiveClass();
        })
    },
    removeActiveClass: () => {
        if($("#sidebar").hasClass("active")) {
            $("#sidebar").removeClass("active")
        }
    },
    backPressed: () => {
        window.history.back();
    },
    expandImage: () => {
        
    },
    sidebarStuff: () => {
        $('#sidebarCollapse').on('click', function () {
            $('#sidebar').toggleClass('active');
            if($("#sidebar").hasClass('active')) {
                $(".wrapper").css("z-index", '20')
            } else {
                $(".wrapper").css("z-index", '1')
            }
            $('.collapse.in').toggleClass('in');
            $('a[aria-expanded=true]').attr('aria-expanded', 'false');
        });
    },
    setSlidesHeight: () => {
        let h = $(".slides").css('height');
        $(".images-slideshow").css('height', h);
    },
    carousel:() => {
        var x = $(".slides")
        x.hide()
        app.slideIndex++;
        if (app.slideIndex > x.length) { app.slideIndex = 1 } 
        $(x[app.slideIndex - 1]).fadeIn(1500); 
        setTimeout(app.carousel, 5000); // Change image every 5 seconds
    },
    adminLogin: () => {
        let f = () => {
            alertify.error("Discarded", 2);
        }
        if (admin) {
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
                'onok': function (e, data) {
                    if (data == "123") {
                        admin = true;
                        $("#admin").fadeIn();
                        $("#admin-img").css('background', '#afa');
                        alertify.success('Logged in as Admin', 2)
                    } else {
                        alertify.error('Wrong Password', 2)
                    }
                },
                'oncancel': f,
                'onexit': f,
                'type': 'text',
                'title': 'Login',
                'resizable': false
            });
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
        stationImg = {
            url: "res/images/map-pin-outlined.png",
            size: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(16, 32),
            scaledSize: new google.maps.Size(32, 32),
        }
        app.myLocation();
    },
    myLocation: () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.onSuccess, app.onError, app.options);
        } else {
            //$("#loader").remove();
            $("body").innerHTML = "Geolocation is not supported by this browser."
        }
    },
    onSuccess: (position) => {
        //pp.hasLoaded();
        app.markPosition(position.coords)
    },
    hasLoaded: () => {
        $("#loader").css('display', 'none');
    },
    onError: () => {
        app.ipApiLocation();
    },
    ipApiLocation: () => {
        $.getJSON("http://ip-api.com/json", callback).fail(error => {
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
        //app.hasLoaded();
    },
    processButtons: (btnID, busID) => {
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
        app.removeActiveClass();
        firstLoad = false;
        let btnID = e.currentTarget.id;
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
        } else if (ride.stations.length > 1) {
            ride.stations.shift()
        } else {
            ride.stations.push(ride_obj)
        }
        data = {
            "busID": busID,
            "lat": lat,
            "lng": lon,
            "timestamp": position.timestamp
        }
        if (!firstLoad) app.addToDb(data)
    },
    insertIntoLS: (key, data) => {
        d = JSON.parse(localStorage.getItem(key));
        d.push(data);
        localStorage.setItem(key, d);
    },
    addToDb: (data) => {
        alertify.confirm(null, function () {
            var ref = firebase.database().ref(dbRoute)
            if (left) {
                var station = ref.child(ridekey + "/arrivals").push() // use old ridekey
                ridekey = "";
                newRide = false;
            }
            else if (newRide) {
                if(ridekey == "") {
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
    loadStationsFromDb: (busNo) => {

        var locations = [];
        database.ref("stations").once("value", function (snap) {
            snap.forEach(function (val) {
                let linije = val.val()['Linije']
                if (linije) {
                    if (linije.includes(busNo.toString())) {
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
    listAllBusNames: () => {
        database.ref("timetable-test/sve_linije").orderByChild('line_number').once('value', function (snap) {
            let json_obj = []
            let temp = Object.keys(snap.val());
            for (let i = 0; i < temp.length; i++) {
                let res = snap.val()[temp[i]]
                json_obj.push(res)
            }

            $("#busNo").append('<option disabled="true">Odaberite bus</option>')
            for (let i = 0; i < json_obj.length; i++) {
                $("#busNo").append('<option><span class="num" style="color:#b75">' + json_obj[i]['line_number'] + '</span>  ' + json_obj[i]['line_route'] + '</option>')
            }
            $('#fetch-stations').on('click', function() {
                let bus = $("#busNo").find(":selected").text().split("  ")[0];
                console.log(bus)
                app.loadStationsFromDb(bus)  
            });
        }, function (err) {
            alertify.alert(null).set({
                'title': "<span style='font-size:15px;'>Something went wrong while fetching busses</span>", 'resizable': true
            }).resizeTo('80%', 150);
        });
    },  
    fetchRoutes: (id, callback) => {
        database.ref("timetable-test/" + id).orderByChild('line_number').once('value', function (snap) {
            let json_obj = []
            let temp = Object.keys(snap.val());
            for (let i = 0; i < temp.length; i++) {
                let res = snap.val()[temp[i]]
                json_obj.push(res)
            }
            callback(json_obj, null);
        }, function (err) {
            callback(err);
        });
    },
    fetchRoutesByZone: (e) => {
        app.removeActiveClass();
        zoneId = e.currentTarget.id; //$(e.target).attr('class');
        console.log(zoneId)
        let resp = '';
        app.fetchRoutes(zoneId, function (times, err) {
            if (err || times.length < 1) {
                resp = "No data to display"
            } else {
                for (let i = 0; i < times.length; i++) {
                    resp = times
                }
            }
            app.listRoutes(resp);
        });
    },
    fetchBusInfo: (busNo, callback) => {
        console.log(busNo)
        database.ref("timetable-test/sve_linije").orderByChild('line_number').equalTo(busNo).once('value', function (snap) {
            let json_obj = []
            let temp = Object.keys(snap.val());
            for (let i = 0; i < temp.length; i++) {
                let res = snap.val()[temp[i]]
                json_obj.push(res)
            }
            callback(json_obj, null);
        }, function (err) {
            callback(err);
        });
    },
    setMarkers: (locations) => {
        var marker, i;
        app.markers = [];
        stationIcon["path"] = google.maps.SymbolPath.CIRCLE;
        var info = new google.maps.InfoWindow({
            pixelOffset: new google.maps.Size(-4, 0)
        })
        for (i = 0; i < locations.length; i++) {
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(locations[i]['Latitude'], locations[i]['Longitude']),
                map: map,
                icon: stationImg
            });
            app.markers.push(marker);
            google.maps.event.addListener(marker, 'click', (function (marker, i) {
                return function () {
                    let c = '<p style="font-weight: normal; line-height: normal;"><strong>Stanica:</strong> ' +
                        locations[i]['Naziv'] + '<br><strong>Busevi:</strong> ' + locations[i]['Linije']
                        //+ '<br><strong>Latitude:</strong> ' +
                        //locations[i]['Latitude'] + '<br><strong>Longitude:</strong> ' +
                        //locations[i]['Longitude'] + '</p>'
                    info.setContent(c);
                    info.open(map, marker);
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
    },
    clearMarkers: (markers) => {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
    },
    showRouteName: (str) => {
        app.id('route-name').innerHTML = str;
    },
    listRoutes: (data) => {
        let out = '<div class="list-group routes" style="font-size: 12px;">'
        for(let i = 0; i < data.length; i++) {
            out += '<a href="#'+data[i]['route_id']+'" class="list-group-item routes-item" id="' + data[i]['route_id'] + '"><span style="color: #a85;font-size: 14px">' + data[i]['line_number'] 
            + "</span>  " + data[i]['line_route'] + '</a>'
        }
        out += '</div>';
        $("#timetable").html(out);
        $(".routes-item").on('click', app.showTimetable)
    },
    listTimetable: (data) => {
        let out = '<table class="table" style="font-size: 13px;">'
            + '<thead class="thead-light">';
        
        out += '<tr>'
                + '<th scope="col">Radni dan</th>'
                + '<th scope="col">Subota</th>'
                + '<th scope="col">Nedjelja i praznik</th>'
            + '</tr>'
            
            
        for(let j = 0; j < data["Radni dan"].length; j++) {
            if(!("Subota" in data)) data["Subota"] = "";
            if(!("Nedjelja i praznik" in data)) data["Nedjelja i praznik"] = "";
            let sub = data["Subota"][j] != undefined ? data["Subota"][j]: ""
            let ned = data["Nedjelja i praznik"][j] != undefined ? data["Nedjelja i praznik"][j]: ""
            out += '<tr>'
                + '<td scope="col">' + data["Radni dan"][j] + '</td>'
                + '<td scope="col">' + sub + '</td>'
                + '<td scope="col">' + ned + '</td>'
            + '</tr>'
        }
        out += '</thead><tbody>'
        out += '</tbody></table>';
        $("#timetable").html(out);
    },
    fetchTimetableByRoute: (routeId, callback) => {
        console.log("ZONE: ", zoneId, "  ROOUTE: ", routeId)
        database.ref("timetable-test/" + zoneId).orderByChild('route_id').equalTo(routeId).once('value', function (snap) {
            let json_obj = []
            let temp = Object.keys(snap.val());
            for (let i = 0; i < temp.length; i++) {
                let res = snap.val()[temp[i]]
                json_obj.push(res)
            }
            callback(json_obj, null);
        }, function (err) {
            callback(err);
        });
    },
    showTimetable: (e) => {
        let routeId = e.currentTarget.id;
        let resp = '';
        app.fetchTimetableByRoute(routeId, function (times, err) {
            if (err || times.length < 1) {
                resp = "No data to display"
            } else {
                for (let i = 0; i < times.length; i++) {
                    resp = times[i]['departures']
                }
            }
            app.listTimetable(resp);
        });
    }
}