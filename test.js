var BMP085 = require('./bmp085_lib/bmp085'),
    barometer = new BMP085();

barometer.read(function (data) {
    console.log("Temperature:", data.temperature);
    console.log("Pressure:", data.pressure);
    console.log("typeof " + typeof(data.pressure));
});
