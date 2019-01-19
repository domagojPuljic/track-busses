function latLonDistance(la1, lo1, la2, lo2) {
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
}
function travelSpeed(loc) {
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
    let time_s = (p2.timestamp - p1.timestamp);
    let speed_mps = dist / time_s;
    let speed_kph = speed_mps / 3.6;
    return speed_kph
}

console.log("DIST: ", latLonDistance(43.5112668, 16.4684625, 43.5163179, 16.4719245))