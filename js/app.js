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
    return new AWS.Cloudwatch()
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

//function to update metrics
function updateMetricsDisplay(data) {
    const timestamp = new Date().toLocaleTimeString();

    document.getElementById("cpu").textContent = "${data.MetricDataResults[0].Values[0]?.toFixed(2) || 0}%";
}

async function startMonitoring() {
    const instanceId = document.getElementById("instanceId").Value;
    const region = document.getElementById("region").Value;
    
    // if (!instanceId || !region){
    //     alert("please enter Instance ID and region")
    //     return
    // }
    monitoring = true;
    document.getElementById("stopBtn").style.display = "inline";

    const cloudwatch = initAWS(region)

    async function fetchData() {
        try{
            const data = await getMetrics(cloudwatch, instanceId);
            updateMetricsDisplay(data);
        }catch (error) {
            console.error("Error fetching metrics:", error)
            stopMonitoring();
            alert("error fetching metric data!")
        }

        await fetchData();

        monitoringInterval =setInterval(fetchData, 60000);
    }

    // function to stop monitoring
    function stopMonitoring() {
        monitoring = false;
        clearInterval(monitoringInterval);
        document.getElementById("stopBtn")
    }
}