const bmp180 = require('bmp180-sensor')
async function readBmp180() {
    const sensor = await bmp180({
        address: 0x77,
        mode: 1,
    })

    const data = await sensor.read();   
    await sensor.close();
    return data;
}
var barometer = readBmp180();
barometer.then(function(data) {
    console.log(data)
});
