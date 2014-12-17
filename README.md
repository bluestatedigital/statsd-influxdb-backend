statsd-influxdb-backend
=======================

StatsD backend for InfluxDB.  Stores values for counters and timers as columns in a single series.  For example:

`select * from timers.glork limit 1` will return 

    [{
        "name": "timers.glork", 
        "columns": [
            "time", 
            "sequence_number", 
            "count", 
            "count_ps", 
            "lower", 
            "mean", 
            "mean_90", 
            "median", 
            "std", 
            "sum", 
            "sum_90", 
            "upper", 
            "upper_90"
        ], 
        "points": [
            [
                1402067451, 
                12330001, 
                92, 
                9.2, 
                129, 
                15971.358695652174, 
                14352.204819277109, 
                15972, 
                9389.22576516102, 
                1469365, 
                1191233, 
                32240, 
                29088
            ]
        ]
    }]


## prefixes

These should be pretty self-explanatory. :-)

* gauges
* counters
* sets
* timers

## usage

statsd config:

    {
        port: 8125,
        
        backends: [ "statsd-influxdb-backend" ],
        
        influx: {
            hosts: [{
                host : "localhost",
                port : 8086
            }],
            username : "root",
            password : "root",
            database : "my_database"
        }
    }


Not the same as [bernd/statsd-influxdb-backend](https://github.com/bernd/statsd-influxdb-backend).

