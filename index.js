"use strict";

var influx = require("influx");

function InfluxBackend(startupTime, config, emitter, logger) {
    // == private functions and declarations
    var self = this;
    var influxdb;
        
    // == public methods
    
    /**
     * Flushes the metrics to InfluxDB.
     *
     * @param {Number} ts - time in epoch seconds
     * @param {Object} metrics - the metrics
     */
    self.flush = function(_ts, metrics) {
        // https://github.com/bencevans/node-influx/issues/31
        var ts = _ts * 1000;
        
        var gauges = metrics.gauges;
        var counters = metrics.counters;
        var counter_rates = metrics.counter_rates;
        var timers = metrics.timers;
        var timer_data = metrics.timer_data;
        var sets = metrics.sets;
        
        // each key must be an array of points
        var payload = {};
        
        Object.keys(gauges).forEach(function(key) {
            payload["gauges." + key] = [{
                time: ts,
                value: gauges[key],
            }];
        });
        
        Object.keys(counters).forEach(function(key) {
            payload["counters." + key] = [{
                time: ts,
                value: counters[key],
                rate:  counter_rates[key],
            }];
        });
        
        Object.keys(sets).forEach(function(key) {
            payload["sets." + key] = [{
                time: ts,
                value: sets[key].length,
            }];
        });
        
        Object.keys(timers).forEach(function(key) {
            // mean_90, std, etc.
            // if no data's been sent for the timer in the current flush
            // interval, there will be no data for the timer.
            if (timer_data[key]) {
                var p = {
                    time: ts,
                };
                
                Object.keys(timer_data[key]).forEach(function(param) {
                    if (param === "histogram") {
                        Object.keys(timer_data[key].histogram).forEach(function(bin) {
                            p["hist_" + bin] = timer_data[key].histogram[bin];
                        });
                    } else {
                        p[param] = timer_data[key][param];
                    }
                });
                
                payload["timers." + key] = [p];
            }
        });
        
        if (Object.keys(payload).length > 0) {
            influxdb.writeSeries(payload, { query: { time_precision: "s" } }, function(err) {
                if (err && logger) {
                    logger.log("unable to write to influxdb: " + err.message, "error");
                }
            });
        }
    };
    
    // == and finally, initialization
    
    influxdb = influx(config.influx);

    emitter.on("flush", function(ts, metrics) { self.flush(ts, metrics); });
    emitter.on("status", function() {});
}

exports.init = function(startupTime, config, emitter, logger) {
    new InfluxBackend(startupTime, config, emitter, logger);
    
    return true;
};
