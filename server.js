// server.js
const express = require('express'); // imports express for server framework
const AWS = require('aws-sdk'); // imports aws sdk to interact with aws
const bodyParser =require('body-parser'); // import nody parser middleware

const app = express();
app.use(bodyParser.json());


// Endpoint to fetch metrics
app.post('/api/getMetrics', async(req, res) => {
    try {
        const {instanceId, region} = req.body;

        if (!instanceId || !region) {
            return res.status(400).json({ error:'instanceid and region are required.'});
        }
        
        AWS.config.update({region}); // configures aws region

        const currentTime = new Date();

        const startTime = new Date(currentTime - (5 * 60 * 1000)); // 5 minutes ago
        const endTime = currentTime;

        const cloudwatch = new AWS.CloudWatch(); // creates cloudwatch service object

        // set parameters for the getmetrics api call
        const params = {
            MetricDataQueries: [
                {
                    Id: 'cpuUtilization',
                    MetricStat: {
                        Metric: {
                            Namespace: 'AWS/EC2',
                            MetricName: 'CPUUtilization',
                            Dimensions: [
                                {
                                    Name: 'InstanceId',
                                    Value: instanceId
                                }
                            ]
                        },
                        Period: 60, // Get data at 1-minute intervals
                        Stat: 'Average'
                    },
                    ReturnData: true
                }
            ],
            StartTime: startTime,
            EndTime: endTime,
        };

    
        const data = await cloudwatch.getMetricData(params).promise(); // get metric data using defined parameters
        res.json(data);
    }catch(err){
        console.error("error fetching metrics:", err);
        res.status(500).json({error: 'error fetching metrics'});
    }
    
});

const PORT = 3000;
app.listen(PORT, () =>{
    console.log("server is running on port "+ PORT);
});