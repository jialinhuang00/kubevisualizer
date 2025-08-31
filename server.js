const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

// Execute kubectl commands
app.post('/api/execute', (req, res) => {
  const { command } = req.body;
  
  if (!command || !command.startsWith('kubectl')) {
    return res.status(400).json({ 
      error: 'Only kubectl commands are allowed',
      success: false 
    });
  }
  
  console.log(`Executing: ${command}`);
  
  exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: error.message,
        stderr: stderr,
        command: command
      });
    }
    
    res.json({
      success: true,
      stdout: stdout,
      stderr: stderr,
      command: command
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  exec('which kubectl && kubectl version --client -o json', (error, stdout, stderr) => {
    const env_info = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      KUBECONFIG: process.env.KUBECONFIG,
      working_directory: process.cwd()
    };
    
    if (error) {
      return res.json({
        status: 'kubectl not available',
        error: error.message,
        environment: env_info,
        stderr: stderr
      });
    }
    
    const lines = stdout.split('\n');
    const kubectlPath = lines[0];
    const versionJson = lines.slice(1).join('\n');
    
    try {
      const version = JSON.parse(versionJson);
      res.json({
        status: 'healthy',
        kubectl: {
          path: kubectlPath,
          version: version.clientVersion?.gitVersion || 'unknown'
        },
        environment: env_info
      });
    } catch (e) {
      res.json({
        status: 'kubectl found but version parse failed',
        kubectl_path: kubectlPath,
        environment: env_info,
        raw_output: versionJson
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 kubecmds-viz server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});