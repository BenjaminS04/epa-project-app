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
    document.getElementById("stopMetricBtn").style.display = "inline";

    
    console.log("running wait fetch");
    await fetchData();
    console.log("data fetch attempted");

    monitoringInterval =setInterval(fetchData, 60000);

    
}

// function to stop monitoring
function stopMonitoring() {
    monitoring = false;
    clearInterval(monitoringInterval);
    document.getElementById("stopMetricBtn").style.display = "none";
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




// -------------------- functions for logging --------------------





let loggingInterval = null; // Variable to store the interval ID

// Variable to store the interval ID
document.addEventListener('DOMContentLoaded', fetchLogGroups);

// get log groups for dropdown
async function fetchLogGroups() {
  try {
    const region = document.getElementById('region').value || 'us-east-1';
    const response = await fetch(`/api/getloggroups?region=${encodeURIComponent(region)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const logGroups = await response.json();
    populateLogGroupDropdown(logGroups);
  
  } catch (error) {
    console.error('Error fetching log groups:', error);
    const dropdown = document.getElementById('logGroupName');
    dropdown.innerHTML = '<option>Error loading log groups</option>';
  }
}

// populate log group dropdown
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


// function to start logging when start logging button is pressed
async function startLogging() {
    const instanceId = document.getElementById('instanceId').value.trim();
    const region = document.getElementById('region').value.trim();
    const logGroupName = document.getElementById('logGroupName').value;
    const startTimeInput = document.getElementById('startTime').value;
    const filterPattern = document.getElementById('filterPattern').value;
  
    // Validation: Check if region is provided
    if (!region) {
      alert('Please enter the Region.');
      return;
    }
  
    // Validation: Check if instanceId is provided
    if (!instanceId) {
      alert('Please enter the Instance ID.');
      return;
    }
  
    // Validation: Check if loggroupname is provided
    if (!logGroupName) {
      alert('Please select a Log Group Name.');
      return;
    }
  
    // Convert ISO datetime to Unix timestamp in milliseconds
    const startTime = startTimeInput ? new Date(startTimeInput).getTime() : undefined;
  
    try {
      // Send request to start polling on the backend
      const response = await fetch(`/api/startPolling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId,
          region,
          logGroupName,
          startTime,
          filterPattern,
          interval: 60000, // Polling interval in milliseconds (1 minute)
        }),
      });
  
      if (!response.ok) throw new Error('Failed to start polling on the backend');
  
      // Start fetching cached logs from backend at regular intervals
      fetchCachedLogs();
      loggingInterval = setInterval(fetchCachedLogs, 5000); // Fetch cached logs every 5 seconds
  
      // Show the Stop button and hide the Start button
      document.getElementById('startLogBtn').style.display = 'none';
      document.getElementById('stopLogBtn').style.display = 'inline';
  
    } catch (error) {
      console.error('Error starting logging:', error);
      alert('Error starting logging: ' + error.message);
    }
  }

// stop logging polling
async function stopLogging() {
  try {
    // Send request to stop polling on the backend
    const response = await fetch(`/api/stopPolling`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Failed to stop polling on the backend');

    // Clear the interval for fetching cached logs
    if (loggingInterval) {
      clearInterval(loggingInterval);
      loggingInterval = null;
    }

    // Hide the Stop button and show the Start button
    document.getElementById('startLogBtn').style.display = 'inline';
    document.getElementById('stopLogBtn').style.display = 'none';

  } catch (error) {
    console.error('Error stopping logging:', error);
    alert('Error stopping logging: ' + error.message);
  }
}

// Function to fetch cached logs from backend
async function fetchCachedLogs() {
  try {
    const response = await fetch(`/api/getCachedLogs`);
    if (!response.ok) throw new Error('Failed to fetch cached logs');
    const logs = await response.json();
    displayLogs(logs);
  
  } catch (error) {
    console.error('Error fetching cached logs:', error);
  }
}

// display logs function
function displayLogs(logs) {
  const logsContainer = document.querySelector('.log-value');
  if (!logsContainer) return;

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