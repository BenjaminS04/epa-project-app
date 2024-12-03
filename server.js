// server.js
const express = require('express'); // imports express for server framework
const AWS = require('aws-sdk'); // imports aws sdk to interact with aws
const bodyParser =require('body-parser'); // import body parser middleware

const app = express();
app.use(bodyParser.json());

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

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
        
        console.log('Fetching metrics from', startTime, 'to', endTime);

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
        console.log('Metrics data received:', JSON.stringify(data, null, 2));
        res.json(data);
    }catch(err){
        console.error("error fetching metrics:", err);
        res.status(500).json({error: 'error fetching metrics'});
    }
    
});



// --------- logs -----------

// Variables to store fetched logs and polling interval
let cachedLogs = [];
let pollingInterval = null;
let isPolling = false;
let pollingParameters = {};

async function fetchLogsFromAWS() {
    const { instanceId, region, logGroupName, startTime, endTime, filterPattern } = pollingParameters;
  
    // Create a new CloudWatchLogs instance with the specified region
    const cloudwatchlogs = new AWS.CloudWatchLogs({ region });
  
    // Modify filterPattern to include instanceId
    let finalFilterPattern = filterPattern || '';
  
    if (finalFilterPattern) {
      finalFilterPattern += ` && @logStream LIKE /${instanceId}/`;
    } else {
      finalFilterPattern = `@logStream LIKE /${instanceId}/`;
    }
  
    const params = {
      logGroupName,
      startTime,
      endTime,
      filterPattern: finalFilterPattern,
      limit: 100, // Adjust as needed
    };
  
    try {
      const data = await cloudwatchlogs.filterLogEvents(params).promise();
      cachedLogs = data.events; // Update cached logs
      console.log(`Fetched logs from AWS (${region}) at`, new Date().toLocaleString());
    } catch (error) {
      console.error(`Error fetching logs from AWS (${region}):`, error);
    }
  }
  
  // Endpoint to start polling
  app.post('/api/startPolling', (req, res) => {
    const { instanceId, region, logGroupName, startTime, endTime, filterPattern, interval } = req.body;
  
    if (isPolling) {
      return res.status(400).json({ message: 'Polling is already in progress.' });
    }
  
    // Validate region
    if (!region) {
      return res.status(400).json({ message: 'Invalid or missing region.' });
    }
  
    // Validate instanceId
    if (!instanceId) {
      return res.status(400).json({ message: 'Instance ID is required.' });
    }
  
    // Validate logGroupName
    if (!logGroupName) {
      return res.status(400).json({ message: 'Log group name is required.' });
    }
  
    // Store polling parameters
    pollingParameters = {
      instanceId,
      region,
      logGroupName,
      startTime: startTime ? Number(startTime) : undefined,
      endTime: endTime ? Number(endTime) : undefined,
      filterPattern,
    };
  
    // Fetch logs immediately and then at specified intervals
    fetchLogsFromAWS();
    const intervalMs = interval ? Number(interval) : 60000; // Default to 60000 ms (1 minute)
    pollingInterval = setInterval(fetchLogsFromAWS, intervalMs);
    isPolling = true;
  
    res.json({ message: 'Polling started.' });
  });
  
  // Endpoint to stop polling
  app.post('/api/stopPolling', (req, res) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      isPolling = false;
      cachedLogs = []; // Clear cached logs
      res.json({ message: 'Polling stopped.' });
    } else {
      res.status(400).json({ message: 'Polling is not active.' });
    }
  });
  
  // Endpoint to get cached logs
  app.get('/api/getCachedLogs', (req, res) => {
    res.json(cachedLogs);
  });
  
  // Endpoint to get all log groups
  app.get('/api/getloggroups', async (req, res) => {
    const region = req.query.region || "us-east-1";

    AWS.config.update({region}); // configures aws region
    
    if (!region) {
      return res.status(400).json({ message: 'Invalid region specified.' });
    }
 
    try {
      const cloudwatchlogs = new AWS.CloudWatchLogs({ region });
      const params = { nextToken: null };
      let logGroups = [];
      let data;
      // test call to verify connectivity
      const testParams = { limit: 1 };
      const test = await cloudwatchlogs.describeLogGroups(testParams).promise();
      console.log('Test log groups fetch:', test);
  
      do {
        data = await cloudwatchlogs.describeLogGroups(params).promise();
        logGroups = logGroups.concat(data.logGroups);
        params.nextToken = data.nextToken || null;
      } while (data.nextToken);
 
      res.json(logGroups);
    } catch (error) {
      console.error('FULL ERROR DETAILS:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
  
      console.error('Error fetching log groups:', error);
      res.status(500).json({ 
        message: 'Error retrieving log groups', 
        error: error.toString() 
      });
    }
 });


//start server on specified port
const PORT = 3000;
app.listen(PORT, () =>{
    console.log("server is running on port "+ PORT);
});