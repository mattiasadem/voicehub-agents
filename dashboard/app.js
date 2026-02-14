// app.js

const agentContainer = document.getElementById('agent-container');
const metricsContainer = document.getElementById('metrics');

async function fetchData() {
    try {
        const tasksResponse = await fetch('/data/.openclaw/workspace/voicehub-agents/TASKS.md');
        const tasksText = await tasksResponse.text();
        const logsResponse = await fetch('/data/.openclaw/workspace/voicehub-agents/logs/2026-02-14.md');
        const logsText = await logsResponse.text();
        // TODO: implement agent status and metrics parsing
        const tasksData = parseTasks(tasksText);
        const logsData = parseLogs(logsText);

        const agents = [
            { id: 'blog-bot', name: 'Blog Content Agent', status: 'Active' },
            { id: 'scout-alpha', name: 'Lead Scout', status: 'Active' },
            { id: 'reach-3', name: 'SDR Outreach Agent', status: 'Active' },
            { id: 'ghost-9', name: 'Social Agent', status: 'Inactive' },
            { id: 'intel-9', name: 'Comp Intel Agent', status: 'Inactive' },
            { id: 'qualify-7', name: 'Qualify Agent', status: 'Inactive' },
            { id: 'rank-4', name: 'Rank Agent', status: 'Inactive' },
            { id: 'revbot', name: 'Revbot Agent', status: 'Inactive' },
            { id: 'health-5', name: 'Health Agent', status: 'Inactive' },
            { id: 'support-1', name: 'Support Agent', status: 'Inactive' },
            { id: 'PageSEO-10', name: 'PageSEO Agent', status: 'Inactive' },
        ];

        renderAgents(agents, logsData, tasksData);
        renderMetrics(logsData);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function parseTasks(tasksText) {
    // Extract tasks from TASKS.md
    const tasks = {};
    const lines = tasksText.split('\n');
    let currentAgent = null;

    for (const line of lines) {
        if (line.startsWith('**')) {
            currentAgent = line.slice(2, line.indexOf('(')).trim();
            if (!tasks[currentAgent]) {
                tasks[currentAgent] = [];
            }
        } else if (currentAgent && line.startsWith('-')) {
            tasks[currentAgent].push(line.slice(2).trim());
        }
    }
    return tasks;
}

function parseLogs(logsText) {
    const logs = {
        activeAgents: 0,
        completedTasks: 0,
        failedTasks: 0,
        hotLeads: 0
    };

    const lines = logsText.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('Active Agents:')) {
            logs.activeAgents = parseInt(line.split(':')[1].trim().split('/')[0]);
        }
        if (line.includes('Completed Tasks:')) {
            logs.completedTasks = parseInt(line.split(':')[1].trim());
        }
        if (line.includes('Failed Tasks:')) {
            logs.failedTasks = parseInt(line.split(':')[1].trim());
        }
        if (line.includes('Hot Leads:')) {
            logs.hotLeads = parseInt(line.split(':')[1].trim());
        }
    }
    return logs;
}


function renderAgents(agents, logsData, tasksData) {
    agentContainer.innerHTML = '';
    agents.forEach(agent => {
        const agentCard = document.createElement('div');
        agentCard.classList.add('agent-card');
        agentCard.innerHTML = `
            <h3>${agent.name}</h3>
            <p>Status: ${agent.status}</p>
            <p>Completed Tasks: ${tasksData[agent.id] ? tasksData[agent.id].filter(task => task.startsWith('[x]')).length : 0}</p>
            <p>Failed Tasks: ${tasksData[agent.id] ? tasksData[agent.id].filter(task => task.includes('FAILED')).length : 0}</p>
        `;
        agentContainer.appendChild(agentCard);
    });
}

function renderMetrics(logsData) {
    metricsContainer.innerHTML = '';
    const metrics = [
        { label: 'Active Agents', value: logsData.activeAgents },
        { label: 'Completed Tasks', value: logsData.completedTasks },
        { label: 'Failed Tasks', value: logsData.failedTasks },
        { label: 'Hot Leads', value: logsData.hotLeads },
    ];

    metrics.forEach(metric => {
        const metricElement = document.createElement('div');
        metricElement.classList.add('metric');
        metricElement.innerHTML = `
            <span>${metric.label}</span>
            <br>
            <span>${metric.value}</span>
        `;
        metricsContainer.appendChild(metricElement);
    });
}


fetchData();
setInterval(fetchData, 60000); // Refresh every 60 seconds
