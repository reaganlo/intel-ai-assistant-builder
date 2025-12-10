# Generated MCP Servers (mcp_codegen)

Custom MCP servers that can be automatically generated using Intel AI Assistant Builder **codegen** framework located at [mcp/mcp_codegen](https://github.com/intel/intel-ai-assistant-builder/tree/main/mcp/mcp_codegen). These servers are purpose-built for Intel AI Assistant Builder, offering optimized performance and seamless integration with the platform's capabilities.

## Examples

Checkout our MCP executible examples in [mcp/mcp_servers](https://github.com/intel/intel-ai-assistant-builder/tree/main/mcp/mcp_servers)
- Mindmap generation server (uses stdio protocol)
- Flight search server (uses HTTP streamable protocol)
- Hotel search server (uses HTTP streamable protocol)
- Math servers (uses stdio protocol)

## Pre-built Executables Available

Ready-to-use executables can be found at [mcp/mcp_servers/binary_build](https://github.com/intel/intel-ai-assistant-builder/tree/main/mcp/mcp_servers/binary_build)

## How to Build Your Own MCP Servers

If you want to create your own custom MCP servers using our autogen framework, follow these methods:

### Method 1: Building to Executable (Recommended)
1. Each MCP server example contains a build script (`build.bat` or `build.sh`)
2. Run the build script in Command Prompt or PowerShell
3. After successful build, the executable will be available in the `dist` folder
4. **Prerequisites:** Python must be installed on your system to run the build scripts

### Method 2: Running with PowerShell Script
1. Each MCP server example contains a `run.ps1` script for direct execution
2. Run the PowerShell script directly without building an executable
3. **Prerequisites:** Python must be installed on your system

## How to Add MCP Server to Intel AI Assistant Builder

### For Executable Method:
1. In the Intel AI Assistant Builder UI, select **Command** as the connection type
2. Set the **MCP Server Command** field to the full path of your generated executable
3. Configure environment variables if needed (e.g., Flight and Hotel servers require `SERP_API_KEY` from [serpapi.com](https://serpapi.com))
4. **For streamable HTTP servers:** If using servers that communicate via `http://127.0.0.1:port/mcp`, ensure localhost is not blocked by adding `NO_PROXY=127.0.0.1,localhost` to your environment variables

See the math server example below for reference:

<img src="./images/math-mcp-server.png" alt="math mcp server" width="50%">

### For PowerShell Script Method:
1. In the Intel AI Assistant Builder UI, select **URL** as the connection type
2. Run the `run.ps1` script to start the server
3. Configure the URL based on the protocol:
   - **HTTP Protocol:** Use `url:port/mcp` for streamable HTTP (e.g., `http://localhost:8000/mcp`)
   - **SSE Protocol:** Use `url:port/sse` (e.g., `http://localhost:8000/sse`)

4. Configure environment variables if needed

## Demo Videos

Explore our comprehensive video demonstrations to see MCP servers in action. All videos are located in the `media\` folder.

### 🧳 Business Travel Agent
**Features:** Flight search and hotel booking with Google Flight and Google Hotel MCP servers  
**Video:** `media\SuperBuilder_Demo_Business_Travel_MCP_Server.mp4`  
**GitHub Link:** [View Video](https://github.com/intel/intel-ai-assistant-builder/blob/main/media/SuperBuilder_Demo_Business_Travel_MCP_Server.mp4)

### 🧠 Mind Map Generator
**Features:** Transform markdown documents into interactive visual mind maps  
**Prerequisites:** Follow the setup instructions in the [Mind Map MCP Server README](https://github.com/intel/intel-ai-assistant-builder/blob/main/mcp/mcp_servers/mcp_mind_map/README.md)  
**Video:** `media\SuperBuilder_Demo_Mindmap_MCP_Server.mp4`  
**GitHub Link:** [View Video](https://github.com/intel/intel-ai-assistant-builder/blob/main/media/SuperBuilder_Demo_Mindmap_MCP_Server.mp4)
