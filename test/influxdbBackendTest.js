/* jshint -W030 */ // expect(…).to.be.true
"use strict";

var chai = require("chai");
var sinon = require("sinon");
var proxyquire = require("proxyquire").noCallThru();
var events = require("events");

chai.use(require("sinon-chai"));

var expect = chai.expect;

// this is what the InfluxDB instance looks like
var InfluxAPI = {
    writeSeries: function() {}
};

// parsed config file hash
var config = {
    influx: {
        // cluster configuration 
        hosts : [
            {
                host : "localhost",
                port : 8060 // optional. default 8086
            }
        ],

        username: "dbuser",
        password: "f4ncyp4ass",
        database: "my_database"
    }
};

describe("InfluxDB backend", function() {
    var backend;
    var influxModuleStub;
    var influxMock;
    var statsdEvents;
    
    beforeEach(function() {
        statsdEvents = new events.EventEmitter();
        
        influxMock = sinon.mock(InfluxAPI);
        influxModuleStub = sinon.stub().returns(influxMock.object); // huh?
        
        backend = proxyquire("..", {
            "influx": influxModuleStub,
        });
        
        // startup time of StatsD in epoch seconds
        var startupTime = Math.floor((new Date()).getTime()/1000);
        
        backend.init(startupTime, config, statsdEvents);
    });
    
    afterEach(function() {
        backend = null;

        influxModuleStub = null;
        
        influxMock.restore();
        influxMock = null;
        
        statsdEvents.removeAllListeners();
        statsdEvents = null;
    });
    
    it("performs initial setup", function() {
        // just pass through config.influx to influx module
        expect(influxModuleStub).to.have.been.calledOnce;
        expect(influxModuleStub).to.have.been.calledWith(config.influx);
        
        // events should be handled
        expect(statsdEvents.listeners("flush")).to.have.length(1);
        expect(statsdEvents.listeners("status")).to.have.length(1);
    });
    
    it("records counters", function() {
        var metricData = {
            "counters": {
                "gorets": 5
            },
            "timers": {},
            "gauges": {},
            "timer_data": {},
            "counter_rates": {
                "gorets": 0.5
            },
            "sets": {},
            "pctThreshold": [ 90 ]
        };
        
        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // record both rate and count
        var expectedPayload = {
            "counters.gorets": [{
                time: ts * 1000,
                value: 5,
                rate: 0.5
            }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);
        
        influxMock.verify();
    });
    
    it("records timers", function() {
        var metricData = {
            "counters": {},
            "timers": {
                "glork": [ 1289, 6258, 6741, 11709, 12193, 17644, 23154, 28606 ]
            },
            "gauges": {},
            "timer_data": {
                "glork": {
                    "mean_90":  11284,
                    "upper_90": 23154,
                    "sum_90":   78988,
                    "std":      8592.861714091528,
                    "upper":    28606,
                    "lower":    1289,
                    "count":    8,
                    "count_ps": 0.8,
                    "sum":      107594,
                    "mean":     13449.25,
                    "median":   11951
                }
            },
            "counter_rates": {},
            "sets": {},
            "pctThreshold": [ 90 ]
        };

        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // record both rate and count
        var expectedPayload = {
            "timers.glork": [{
                time:     ts * 1000,
                mean_90:  11284,
                upper_90: 23154,
                sum_90:   78988,
                std:      8592.861714091528,
                upper:    28606,
                lower:    1289,
                count:    8,
                count_ps: 0.8,
                sum:      107594,
                mean:     13449.25,
                median:   11951
            }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);
        
        influxMock.verify();
    });
    
    it("records timers with histograms", function() {
        var metricData = {
            "counters": {},
            "timers": {
                "glork": [ 2295, 6838, 9564, 11865, 14591, 17316, 20042, 21860, 24585, 27311, 29612, 32338 ]
            },
            "gauges": {},
            "timer_data": {
                "glork": {
                    "mean_90":  16898.090909090908,
                    "upper_90": 29612,
                    "sum_90":   185879,
                    "std":      9042.788260311823,
                    "upper":    32338,
                    "lower":    2295,
                    "count":    12,
                    "count_ps": 1.2,
                    "sum":      218217,
                    "mean":     18184.75,
                    "median":   18679,
                    "histogram": {
                        "bin_100":   0,
                        "bin_1000":  0,
                        "bin_10000": 3,
                        "bin_25000": 6,
                        "bin_inf":   3
                    }
                }
            },
            "counter_rates": {},
            "sets": {},
            "pctThreshold": [ 90 ]
        };

        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // record both rate and count
        var expectedPayload = {
            "timers.glork": [{
                time:           ts * 1000,
                mean_90:        16898.090909090908,
                upper_90:       29612,
                sum_90:         185879,
                std:            9042.788260311823,
                upper:          32338,
                lower:          2295,
                count:          12,
                count_ps:       1.2,
                sum:            218217,
                mean:           18184.75,
                median:         18679,
                hist_bin_100:   0,
                hist_bin_1000:  0,
                hist_bin_10000: 3,
                hist_bin_25000: 6,
                hist_bin_inf:   3
            }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);
        
        influxMock.verify();
    });

    it("records gauges", function() {
        var metricData = {
            "counters": {},
            "timers": {},
            "gauges": {
                "gaugor": 16621
            },
            "timer_data": {},
            "counter_rates": {},
            "sets": {},
            "pctThreshold": [ 90 ]
        };
        
        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // record both rate and count
        var expectedPayload = {
            "gauges.gaugor": [{
                time: ts * 1000,
                value: 16621,
            }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);
        
        influxMock.verify();
    });
    
    it("records sets", function() {
        var metricData = {
            "counters": {},
            "timers": {},
            "gauges": {},
            "timer_data": {},
            "counter_rates": {},
            "sets": {
                "foo": [ "a", "b", "c" ],
                "bar": [ "d", "e", "f", "g" ]
            },
            "pctThreshold": [ 90 ]
        };
        
        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // record both rate and count
        var expectedPayload = {
            "sets.foo": [{
                time: ts * 1000,
                value: 3,
            }],
            "sets.bar": [{
                time: ts * 1000,
                value: 4,
            }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);
        
        influxMock.verify();
    });
    
    it("handles timers with no data", function() {
        // when no data's been received for a timer since the last flush
        var metricData = {
            "counters": {
                "gorets": 5
            },
            "gauges": {},
            "timers": {
                "glork": []
            },
            "timer_counters": {
                "glork": 0
            },
            "sets": {},
            "counter_rates": {
                "gorets": 0.5
            },
            "timer_data": {},
            "pctThreshold": [ 90 ],
            "statsd_metrics": {
                "processing_time": 0
            }
        };
        
        // current time in epoch seconds
        var ts = Math.floor((new Date()).getTime()/1000);
        
        // @todo fake the missing columns
        var expectedPayload = {
            "counters.gorets": [{ time: ts * 1000, value: 5, rate: 0.5 }]
        };
        
        influxMock
            .expects("writeSeries")
            .once()
            .withArgs(expectedPayload);
        
        statsdEvents.emit("flush", ts, metricData);

        influxMock.verify();
    });
});
