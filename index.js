var Service;
var Characteristic;
var HomebridgeAPI;
var inherits = require('util').inherits;

// the i2c module won't install on a raspberry pi
// please see https://github.com/kelly/node-i2c/issues/69
// jnovack provides a work around.
// clone the BMP180 project into the folder below
var BMP180 = require('node-bmp180');

// timeout to rest the device a little.
var timeDifference = 2500;

function diffBigEnough(last) {
    var now = new Date();
    if ( (now.getTime() - last.getTime()) < timeDifference) {
        return false;
    } else {
        return true;
    }
}

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    homebridge.registerAccessory("homebridge-bmpxxx", "bmpxxx", BMPXXXSensor);
};

function BMPXXXSensor(log, config) {
    this.log = log;
    this.name = config.name;
    this.lastTimestamp = new Date();
    this.barometer = new BMP180.BMP180()();
    var that = this;
    this.barometer.read(function(data) {
        that.lastRecord = data;
    });



    EveAirPressure = function () {
        //todo: only rough guess of extreme values -> use correct min/max if known
        Characteristic.call(this, 'AirPressure', 'E863F10F-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "hPa",
            maxValue: 1085,
            minValue: 870,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveAirPressure, Characteristic);

    EveBatteryLevel = function () {
        Characteristic.call(this, 'Eve Battery Level', 'E863F11B-079E-48FF-8F27-9C2605A29F52');
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "PERCENTAGE",
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(EveBatteryLevel, Characteristic);

    //Eve service (custom UUID)
    EveWeatherService = function (displayName, subtype) {
        Service.call(this, displayName, 'E863F001-079E-48FF-8F27-9C2605A29F52', subtype);
        // Required Characteristics
        this.addCharacteristic(EveAirPressure);
        // Optional Characteristics
        this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
        this.addOptionalCharacteristic(Characteristic.CurrentTemperature);
        this.addOptionalCharacteristic(EveBatteryLevel);
    };
    inherits(EveWeatherService, Service);



    // info service
    this.informationService = new Service.AccessoryInformation();
        
    this.informationService
    .setCharacteristic(Characteristic.Manufacturer, config.manufacturer || "Bosch")
    .setCharacteristic(Characteristic.Model, config.model || "BMP180")
    .setCharacteristic(Characteristic.SerialNumber, config.serial || "775D80FF");




    // thermo service

    this.service_therm = new Service.TemperatureSensor(this.name);

    this.service_therm.getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getTemp.bind(this));


    // eve service

    this.eve_service = new EveWeatherService(this.name);
    this.eve_service.getCharacteristic(EveAirPressure)
        .on('get', this.getCurrentAirPressure.bind(this));


    // auto refresh

    if (config.autoRefresh && config.autoRefresh > 0) {
        var that = this;
        setInterval(function() {
            that.lastTimestamp = new Date();

            that.barometer.read(function(data) {

                that.lastRecord = data;

                that.eve_service.getCharacteristic(EveAirPressure)
                    .setValue(parseFloat(data.pressure.toFixed(2)));
                that.service_therm.getCharacteristic(Characteristic.CurrentTemperature)
                    .setValue(data.temperature);
            });
        }, config.autoRefresh * 1000);
    }
}

BMPXXXSensor.prototype.getTemp = function(callback) {
    if (diffBigEnough(this.lastTimestamp)) {
        this.lastTimestamp = new Date();
        var that = this;
        this.barometer.read(function(data) {
            that.lastRecord = data;
            that.eve_service.getCharacteristic(EveAirPressure)
                .setValue(parseFloat(data.pressure.toFixed(2)));
            callback(null, data.temperature);
        });
    } else {
        callback(null, parseFloat(this.lastRecord.temperature.toFixed(2)));
    }
};

BMPXXXSensor.prototype.getCurrentAirPressure = function(callback) {
    if (diffBigEnough(this.lastTimestamp)) {
        this.lastTimestamp = new Date();
        var that = this;
        this.barometer.read(function(data) {
            that.lastRecord = data;
            that.service_therm.getCharacteristic(Characteristic.CurrentTemperature)
                .setValue(data.temperature);
            callback(null, parseFloat(data.pressure.toFixed(2)));
        });
    } else {
        callback(null, parseFloat(this.lastRecord.pressure.toFixed(2)));
    }  
};

BMPXXXSensor.prototype.getServices = function() {
    return [this.informationService, this.service_therm, this.eve_service];
};
