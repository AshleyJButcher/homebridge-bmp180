var BMP180 = require('node-bmp180');
var barometer = new BMP180.BMP180();

barometer.read().then((t) =>{

   console.log(`Pressure: ${t.pressure} Pa`);
   console.log(`Temperature: ${t.temperature} C`);
});
