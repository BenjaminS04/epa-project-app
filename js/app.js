// global variables
let monitoring = false;
let monitoringInterval;
const dataPoints = {
    cpu:[],
    diskRead:[]
}
// initialise AWS SDK
function initAWS(region) {
    AWS.config.region = region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId:'' //leave empty as app should use the instance's assigned role
    })
    return new AWS.Cloudwatch
}
// Defines the parameters for the GetMetricData API request, async used to allow use of promise
async function getMetrics(cloudwatch, instanceId) {
    StartTime = new Date(new Date() - 300000); // last 5 mins
    EndTime = new Date();
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
        StartTime: StartTime,
        EndTime:EndTime
    };

    // returns promise to fetch metrics from cloudwatch
    return new Promise((resolve, reject)=>{
        cloudwatch.getMetricData(params, (err, data) =>{
            if (err) reject(err);
            else resolve(data);
        });
    });
};

// Call the GetMetricData API
cloudwatch.getMetricData(params, (err, data) => {
    if (err) {
        console.log("Error fetching metrics: ", err);
    } else {
        console.log("Fetched metrics: ", data);
        // Here you can update the web app's front end to display the metrics
    }
});