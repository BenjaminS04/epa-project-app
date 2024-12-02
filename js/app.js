// global variables
let monitoring = false;
let monitoringInterval;
let instanceId;
let region;

async function fetchData() {
    try{
        const response = await fetch('/api/getMetrics',{
            method: 'POST', // use post method
            headers: {
                'Content-Type':'application/json', // request body is json
            },
            body: JSON.stringify({instanceId, region}), // send instance id and region in request body
        });

        if (!response.ok) {
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


async function startMonitoring() {
    instanceId = document.getElementById("instanceId").value;
    region = document.getElementById("region").value;

    console.log("instance ID:", instanceId);
    console.log("region:", region);

    if (!instanceId || !region){ // checks for input
        alert("please enter Instance ID and region");
        return
    }

    console.log("starting monitoring");

    monitoring = true;
    document.getElementById("stopBtn").style.display = "inline";

    
    console.log("running wait fetch");
    await fetchData();
    console.log("data fetch attempted");

    monitoringInterval =setInterval(fetchData, 60000);

    
}

// function to stop monitoring
function stopMonitoring() {
    monitoring = false;
    clearInterval(monitoringInterval);
    document.getElementById("stopBtn").style.display = "none";
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



// log functions

document.addEventListener('DOMContentLoaded', fetchLogGroups);

async function fetchLogGroups() {
  try {
    const response = await fetch('/getloggroups');
    if (!response.ok) throw new Error('Network response was not ok');
    const logGroups = await response.json();
    populateLogGroupDropdown(logGroups);
  } catch (error) {
    console.error('Error fetching log groups:', error);
    const dropdown = document.getElementById('logGroupName');
    dropdown.innerHTML = '<option>Error loading log groups</option>';
  }
}

function populateLogGroupDropdown(logGroups) {
  const dropdown = document.getElementById('logGroupName');
  if (logGroups.length === 0) {
    dropdown.innerHTML = '<option>No log groups available</option>';
    return;
  }
  dropdown.innerHTML = logGroups
    .map(logGroup => `<option value="${logGroup.logGroupName}">${logGroup.logGroupName}</option>`)
    .join('');
}

async function fetchLogs() {
  const logGroupName = document.getElementById('logGroupName').value;
  const startTimeInput = document.getElementById('startTime').value;
  const endTime = currentTime;
  const filterPattern = document.getElementById('filterPattern').value;

  // Convert ISO datetime to Unix timestamp in milliseconds
  const startTime = startTimeInput ? new Date(startTimeInput).getTime() : undefined;
  

  const params = new URLSearchParams({
    logGroupName,
    ...(startTime && { startTime }),
    ...(endTime && { endTime }),
    ...(filterPattern && { filterPattern }),
  });

  try {
    const response = await fetch(`/getlogs?${params.toString()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const logs = await response.json();
    displayLogs(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    document.getElementById('logs').innerHTML = `<p>Error fetching logs: ${error.message}</p>`;
  }
}

function displayLogs(logs) {
  const logsContainer = document.getElementById('logs');
  if (logs.length === 0) {
    logsContainer.innerHTML = '<p>No logs found for the specified parameters.</p>';
    return;
  }
  logsContainer.innerHTML = logs
    .map(
      log => `<p><strong>${new Date(log.timestamp).toLocaleString()}:</strong> ${log.message}</p>`
    )
    .join('');
}
