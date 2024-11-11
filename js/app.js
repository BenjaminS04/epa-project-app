// global variables
let monitoring = false;
let monitoringInterval;

async function startMonitoring() {
    const instanceId = document.getElementById("instanceId").value;
    const region = document.getElementById("region").value;

    console.log("instance ID:", instanceId);
    console.log("region:", region);

    if (!instanceId || !region){ // checks for input
        alert("please enter Instance ID and region");
        return
    }

    console.log("starting monitoring");

    monitoring = true;
    document.getElementById("stopBtn").style.display = "inline";

    const cloudwatch = initAWS(region);

    async function fetchData() {
        try{
            const response = await fetch('/api/getMetrics',{
                method: 'POST', // use post method
                headers: {
                    'Content-Type':'application/json', // request body is json
                },
                body: JSON.stringify({instanceId, region}), // send instance id and region in request body
            });

            if (!responsse.ok) {
                throw new Error('Network response not ok.');
            }

            const data = await response.json();
            updateMetricsDisplay(data)
        }catch (error) {
            console.error("Error fetching metrics:", error);
            stopMonitoring();
            alert("error fetching metric data!");
        }
     }
    console.log("running wait fetch");
    await fetchData();
    console.log("data fetch attempted");

    monitoringInterval =setInterval(fetchData, 60000);

    // function to stop monitoring
    function stopMonitoring() {
        monitoring = false;
        clearInterval(monitoringInterval);
        document.getElementById("stopBtn").style.display = "none";
    }
}

//function to update metrics
function updateMetricsDisplay(data) {
    const cpuUtilization= data.MetricDataResults.find(
        (metric) => metric.Id === 'cpuUtilization'
    );

    const cpuValue = cpuUtilization.Values.length > 0
        ? cpuUtilization.Values[0].toFixed(2)
        : '0.00';
    document.getElementById("cpu").textContent = cpuValue +"%";
}

