# mind_map MCP Server

Create Mind Map

## Overview
This is a MCP (Model Context Protocol) server generated using the MCP Server Generator. 
It provides a standardized framework for building MCP servers with robust process management,
cross-process control, and production-ready deployment capabilities.

## Configuration
- **Server Name**: mind_map
- **Protocol**: stdio
- **Default Port**: N/A (stdio protocol)
- **Environment Variables**:
  - `MCP_MIND_MAP_PROTOCOL`: Override protocol (stdio, sse, http)
  - `MCP_MIND_MAP_PORT`: Override default port (only for sse/http protocols - current: 7905)

## Prerequisites

Before using the mind_map MCP server, you need to install the required dependencies:

### 1. Install Node.js
Download and install the Windows installer (.msi) from: https://nodejs.org/en/download/current

### 2. Install markmap-cli
Open Command Prompt (cmd) and run:
```cmd
npm install -g markmap-cli
```

### 3. Add npm Package Path to System PATH
After installing markmap-cli globally, you need to add the npm package path to your system PATH:

1. **Find the npm package directory:**
   ```cmd
   npm list -g markmap-cli
   ```
   This will show the markmap-cli package path (e.g., `C:\Users\YourName\AppData\Roaming\npm`)

2. **Add to System PATH:**
   - Open System Properties (Win + X → System → Advanced system settings)
   - Click "Environment Variables"
   - Under "System Variables", find and select "Path", then click "Edit"
   - Click "New" and add the npm directory path from step 1 (e.g., `C:\Users\YourName\AppData\Roaming\npm`)
   - Click "OK" to save all changes

3. **Restart your system or log out/in** to ensure the PATH changes take effect

### 4. Configure PowerShell Execution Policy (Required for Windows)
Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
```
This is required because the mindmap creation needs to access local file paths.

## Quick Start

### 1. Setup Environment
```powershell
# Install dependencies and activate virtual environment
.\setup.ps1
```

### 2. Development Usage
```powershell
# Start server for development (using stdio protocol)
python server.py start

# Check status
python server.py status --json

# Stop server
python server.py stop
```

### 3. Build for Production
```powershell
# Build standalone executable
.\build.ps1

# The executable will be created in dist/mind_map-mcp-server.exe
```

### 4. Production Usage
```powershell
# Run the built executable (using stdio protocol)
.\dist\mind_map-mcp-server.exe start

# Check status
.\dist\mind_map-mcp-server.exe status --json

# Stop server
.\dist\mind_map-mcp-server.exe stop
```

## Development

### Command Line Interface

The server supports the following commands in both Python and executable formats:

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start the server | `python server.py start` |
| `start --protocol sse --port 8080` | Start with specific protocol/port | `python server.py start --protocol sse --port 8080` |
| `stop` | Stop the server (cross-process) | `python server.py stop` |
| `status` | Check server status | `python server.py status --json` |
| `ping` | Health check | `python server.py ping` |
| `version` | Show version info | `python server.py version --json` |
| `help` | Show help message | `python server.py help` |

### Protocol Support

This server is configured to use the **stdio** protocol.

**Current Configuration:**
- **Active Protocol**: stdio
- **Description**: Standard input/output communication, no port required
- **Port Required**: No
- **Default Port**: N/A (stdio protocol)

### Adding New Tools

Add custom MCP tools using the `@mcp.tool()` decorator:

```python
@mcp.tool()
async def my_custom_tool(input_param: str) -> str:
    \"\"\"Custom tool implementation.
    
    Args:
        input_param: Description of the input parameter
    
    Returns:
        str: Description of the return value
    \"\"\"
    # Your implementation here
    return f"Processed: mind_map"
```

### Testing

Run the comprehensive test suite:

```powershell
# Run all tests
python test_server.py

# Run specific test
python -m unittest test_server.TestMind_mapServer.test_server_version
```

Tests validate:
- Server start/stop functionality
- Command-line interface
- JSON response formatting
- Cross-process management

## Production Deployment

### Building

Create a standalone executable for distribution:

```powershell
# Windows batch build
.\build.bat

# PowerShell build (recommended)
.\build.ps1
```

Build output:
- `dist/mind_map-mcp-server.exe`: Standalone executable
- `build/`: Build artifacts and dependencies
- All dependencies bundled via PyInstaller

### Distribution

The built executable can be distributed without Python dependencies:

```powershell
# Copy executable to target system
Copy-Item .\dist\mind_map-mcp-server.exe C:\MyServers\

# Run on target system
C:\MyServers\mind_map-mcp-server.exe start
```

### Process Management

The server includes robust process management:

- **PID File Tracking**: `server.pid` tracks running processes (when applicable)
- **Cross-Process Control**: Stop servers from different terminals (for sse/http protocols)
- **Port Conflict Detection**: Prevents multiple instances (sse/http protocols only)
- **Graceful Shutdown**: Proper cleanup of resources
- **Platform Support**: Windows (`taskkill`) and Unix (`kill`) for port-based protocols
- **Protocol-Aware**: stdio protocol uses simpler process management without ports

## Management Scripts

### PowerShell Management
```powershell
# Use the management script for common operations
.\manage-server.ps1 start
.\manage-server.ps1 status
.\manage-server.ps1 stop
.\manage-server.ps1 restart
```

### Manual Management
```powershell
# Direct Python execution (current protocol: stdio)
python server.py start                              # Start with configured protocol
python server.py start --protocol sse --port 8080    # Override to use SSE protocol with custom port
python server.py status --json
python server.py stop

# Direct executable execution (current protocol: stdio)
.\dist\mind_map-mcp-server.exe start                              # Start with configured protocol
.\dist\mind_map-mcp-server.exe start --protocol sse --port 8080    # Override to use SSE protocol with custom port
.\dist\mind_map-mcp-server.exe status --json
.\dist\mind_map-mcp-server.exe stop
```

## Troubleshooting

### Common Issues

**Server won't stop:**
```powershell
# Check for PID file
Get-ChildItem server.pid

# Manual process termination
taskkill /F /PID <pid_from_file>

# Remove stale PID file
Remove-Item server.pid
```

**Port already in use (sse/http protocols only):**
```powershell
# Check what's using the port
netstat -ano | findstr 7905

# Kill conflicting process
taskkill /F /PID <pid>
```

**Build errors:**
```powershell
# Clean build artifacts
Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue

# Rebuild
.\build.ps1
```

### Debug Mode

Enable detailed logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Project Structure

```
mind_map/
├── server.py                 # Main server implementation with PID management
├── server.pid                # Process ID file (created at runtime)
├── requirements.txt          # Python dependencies
├── test_server.py           # Unit tests with MCP testing
├── setup.ps1               # Environment setup script
├── run.ps1                 # Quick run script
├── manage-server.ps1       # Server management script
├── build.ps1               # PowerShell build script
├── build.bat               # Windows batch build script
├── mind_map_server.spec # PyInstaller specification
└── README.md               # This documentation
```

## Requirements

- **Development**: Python 3.8+, PowerShell 5.0+
- **Production**: Windows/Linux (standalone executable)
- **Dependencies**: See `requirements.txt`

## Generated Information

- **Date**: 2025-09-02 10:33:05
- **Generator**: MCP Server Generator v1.0.0
- **Framework**: FastMCP with stdio transport
- **Architecture**: Protocol-aware process management