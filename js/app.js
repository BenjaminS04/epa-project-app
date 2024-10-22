// Include the AWS SDK in web app
const AWS = require('aws-sdk');

// Configure the SDK with the appropriate region and credentials
AWS.config.update({
    region: 'us-east-1' // Use the region where the EC2 instance is running
});

// Create a new CloudWatch client
const cloudwatch = new AWS.CloudWatch();

// Defines the parameters for the GetMetricData API request
const params = {
    StartTime: new Date(new Date() - 60 * 60 * 1000), // 1 hour ago
    EndTime: new Date(),
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
                            Value: 'YOUR_INSTANCE_ID'
                        }
                    ]
                },
                Period: 60, // Get data at 1-minute intervals
                Stat: 'Average'
            },
            ReturnData: true
        }
    ]
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