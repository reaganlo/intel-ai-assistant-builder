using Grpc.Core;
using Grpc.Net.Client;
using SuperBuilderWinService;
using Newtonsoft.Json;

internal class Program
{
    private const string GrpcServerAddress = "http://localhost:5006";
    private const string ClientName = "SuperBuilder - CSharp Example";

    private static async Task Main()
    {
        Console.WriteLine("Connecting to SuperBuilder Middleware...");

        using var channel = CreateGrpcChannel();
        var client = new SuperBuilder.SuperBuilderClient(channel);

        await SayHelloAsync(client);
        //await SetParametersAsync(client);
        //await RunBasicChatAsync(client);
        //await RunRAGChatAsync(client);
        //await ManageMCPServersAsync(client);
        //await RunSuperAgentChatAsync(client);
        await RunSuperAgentRAGChatAsync(client);

        Console.WriteLine("\n=== Done ===");
    }

    #region Channel Setup
    private static GrpcChannel CreateGrpcChannel()
    {
        var httpHandler = new HttpClientHandler
        {
            UseProxy = false,
            ServerCertificateCustomValidationCallback =
                HttpClientHandler.DangerousAcceptAnyServerCertificateValidator // Dev only
        };

        var httpClient = new HttpClient(httpHandler)
        {
            DefaultRequestVersion = new Version(2, 0),
            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrHigher
        };

        return GrpcChannel.ForAddress(GrpcServerAddress, new GrpcChannelOptions
        {
            HttpClient = httpClient,
            Credentials = ChannelCredentials.Insecure // Local dev
        });
    }
    #endregion

    #region Hello
    private static async Task SayHelloAsync(SuperBuilder.SuperBuilderClient client)
    {
        Console.WriteLine("\n-------- Say Hello --------");

        try
        {
            var response = await client.SayHelloAsync(new SayHelloRequest
            {
                Name = ClientName
            });

            Console.WriteLine($"Server Reply: {response.Message}");
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"gRPC error: {ex.Status.Detail}");
        }
    }
    #endregion

    #region Add Files
    private static async Task AddFilesAsync(
        SuperBuilder.SuperBuilderClient client,
        string[] ragFiles)
    {
        var request = new AddFilesRequest
        {
            FilesToUpload = ToJsonArray(ragFiles)
        };

        try
        {
            var stream = client.AddFiles(request);

            await foreach (var response in stream.ResponseStream.ReadAllAsync())
            {
                if (!string.IsNullOrEmpty(response.CurrentFileUploading))
                {
                    Console.WriteLine(
                        $"Uploading {response.CurrentFileUploading}: {response.CurrentFileProgress}%");
                }

                if (!string.IsNullOrEmpty(response.FilesUploaded))
                {
                    Console.WriteLine($"Uploaded: {response.FilesUploaded}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"File upload failed: {ex.Message}");
        }
    }
    #endregion

    #region MCP Management
    private static async Task RemoveMcpServerByNameAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpServerName)
    {
        try
        {
            var response = await client.RemoveMCPServerAsync(
                new RemoveMCPServerRequest
                {
                    ServerName = mcpServerName
                });

            if (!response.Success)
            {
                Console.WriteLine(
                    $"Failed to remove MCP server '{mcpServerName}': {response.Message}");
            }
            else
            {
                Console.WriteLine(
                    $"Successfully removed MCP server '{mcpServerName}': {response.Message}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error removing MCP server: {ex.Message}");
        }
    }

    private static async Task<string> AddMcpServerAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpServerName,
        string command,
        string args,
        string url = "",
        string env = "")
    {
        try
        {
            var addResponse = await client.AddMCPServerAsync(new AddMCPServerRequest
            {
                Server = new MCPServer
                {
                    Name = mcpServerName,
                    Command = command,
                    Args = args,
                    Url = url,
                    Env = env
                }
            });

            Console.WriteLine($"Add Server Response: Success={addResponse.Success}, Message={addResponse.Message}");

            if (addResponse.Success && addResponse.Server != null)
            {
                Console.WriteLine($"Server Added: Name={addResponse.Server.Name}");
                return addResponse.Server.Name;
            }

            return mcpServerName;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding MCP server: {ex.Message}");
            return null;
        }
    }

    private static async Task<bool> StartMcpServerAsync(
        SuperBuilder.SuperBuilderClient client,
        string serverName)
    {
        try
        {
            var response = await client.StartMCPServerAsync(new StartMCPServerRequest
            {
                ServerName = serverName
            });

            Console.WriteLine($"Start Server Response: Success={response.Success}, Message={response.Message}");
            return response.Success;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error starting MCP server: {ex.Message}");
            return false;
        }
    }

    private static async Task<bool> StopMcpServerAsync(
        SuperBuilder.SuperBuilderClient client,
        string serverName)
    {
        try
        {
            var response = await client.StopMCPServerAsync(new StopMCPServerRequest
            {
                ServerName = serverName
            });

            Console.WriteLine($"Stop Server Response: Success={response.Success}, Message={response.Message}");
            return response.Success;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error stopping MCP server: {ex.Message}");
            return false;
        }
    }

    private static async Task StopAndRemoveMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName)
    {
        if (string.IsNullOrWhiteSpace(agentName))
        {
            throw new ArgumentException("Agent name must be provided.", nameof(agentName));
        }

        try
        {
            // 1. Stop the agent
            var stopResponse = await client.StopMCPAgentAsync(
                new StopMCPAgentRequest
                {
                    AgentName = agentName
                });

            if (!stopResponse.Success)
            {
                Console.WriteLine(
                    $"Failed to stop agent '{agentName}': {stopResponse.Message}");
            }
            else
            {
                Console.WriteLine(
                    $"Agent '{agentName}' stopped successfully: {stopResponse.Message}");
            }

            // 2. Remove the agent
            var removeResponse = await client.RemoveMCPAgentAsync(
                new RemoveMCPAgentRequest
                {
                    AgentName = agentName
                });

            if (!removeResponse.Success)
            {
                Console.WriteLine(
                    $"Failed to remove agent '{agentName}': {removeResponse.Message}");
            }
            else
            {
                Console.WriteLine(
                    $"Agent '{agentName}' removed successfully: {removeResponse.Message}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in StopAndRemoveMcpAgent: {ex.Message}");
        }
    }

    private static async Task<string> AddMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpAgentName,
        string desc,
        string message,
        params string[] serverNames)
    {
        try
        {
            var agent = new MCPAgent
            {
                Name = mcpAgentName,
                Desc = desc,
                Message = message
            };

            // Add server names to the repeated field
            agent.ServerNames.AddRange(serverNames);

            var addResponse = await client.AddMCPAgentAsync(
                new AddMCPAgentRequest
                {
                    Agent = agent
                });

            Console.WriteLine($"Add Agent Response: Success={addResponse.Success}, Message={addResponse.Message}");

            if (addResponse.Success && addResponse.Agent != null)
            {
                Console.WriteLine($"Agent Added: Name={addResponse.Agent.Name}");
                return addResponse.Agent.Name;
            }

            return mcpAgentName;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding MCP agent: {ex.Message}");
            return null;
        }
    }

    private static async Task<bool> StartMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName)
    {
        try
        {
            var response = await client.StartMCPAgentAsync(new StartMCPAgentRequest
            {
                AgentName = agentName
            });

            Console.WriteLine($"Start Agent Response: Success={response.Success}, Message={response.Message}");
            return response.Success;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error starting MCP agent: {ex.Message}");
            return false;
        }
    }

    private static async Task ListMcpServersAsync(SuperBuilder.SuperBuilderClient client)
    {
        try
        {
            var response = await client.GetMCPServersAsync(new GetMCPServersRequest());

            Console.WriteLine($"\nFound {response.Servers.Count} MCP Server(s):");
            foreach (var server in response.Servers)
            {
                Console.WriteLine($"  Name={server.Name}, Command={server.Command}, Args={server.Args}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error listing MCP servers: {ex.Message}");
        }
    }

    private static async Task ListMcpAgentsAsync(SuperBuilder.SuperBuilderClient client)
    {
        try
        {
            var response = await client.GetMCPAgentsAsync(new GetMCPAgentsRequest());

            Console.WriteLine($"\nFound {response.Agents.Count} MCP Agent(s):");
            foreach (var agent in response.Agents)
            {
                var servers = string.Join(", ", agent.ServerNames);
                Console.WriteLine($"  Name={agent.Name}, Desc={agent.Desc}, Servers=[{servers}]");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error listing MCP agents: {ex.Message}");
        }
    }

    private static async Task<List<string>> GetActiveMcpServersAsync(SuperBuilder.SuperBuilderClient client)
    {
        try
        {
            var response = await client.GetActiveMCPServersAsync(new GetActiveMCPServersRequest());
            Console.WriteLine($"Active MCP Servers: {string.Join(", ", response.Names)}");
            return response.Names.ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting active MCP servers: {ex.Message}");
            return new List<string>();
        }
    }

    private static async Task<List<string>> GetActiveMcpAgentsAsync(SuperBuilder.SuperBuilderClient client)
    {
        try
        {
            var response = await client.GetActiveMCPAgentsAsync(new GetActiveMCPAgentsRequest());
            Console.WriteLine($"Active MCP Agents: {string.Join(", ", response.Names)}");
            return response.Names.ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting active MCP agents: {ex.Message}");
            return new List<string>();
        }
    }
    #endregion

    #region SuperAgent RAG Chat
    private static async Task RunSuperAgentRAGChatAsync(
        SuperBuilder.SuperBuilderClient client)
    {
        Console.WriteLine("\n======== SuperAgent RAG Chat Setup ========");

        const string agentName = "PDFAgent";
        const string mcpServerName = "mcp-server-pdf";

        // Step 1: Clean up existing agent
        Console.WriteLine("\n-------- Remove Existing Agent --------");
        await StopAndRemoveMcpAgentAsync(client, agentName);

        // Step 2: Clean up existing server
        Console.WriteLine("\n-------- Remove Existing MCP Server --------");
        await StopMcpServerAsync(client, mcpServerName);
        await RemoveMcpServerByNameAsync(client, mcpServerName);

        // Step 3: Add MCP Server
        Console.WriteLine("\n-------- Add MCP Server --------");
        var mcpServerExePath = Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(), "..", "..", "shared", "mcp-server-pdf.exe"));

        if (!File.Exists(mcpServerExePath))
        {
            Console.WriteLine($"ERROR: MCP Server exe not found at {mcpServerExePath}");
            return;
        }

        var mcpArgs = "start";
        var serverName = await AddMcpServerAsync(
            client, mcpServerName, mcpServerExePath, mcpArgs);

        if (string.IsNullOrEmpty(serverName))
        {
            Console.WriteLine("Failed to add MCP server.");
            return;
        }

        // Step 4: Start MCP Server
        Console.WriteLine("\n-------- Start MCP Server --------");
        var serverStarted = await StartMcpServerAsync(client, serverName);
        if (!serverStarted)
        {
            Console.WriteLine("Failed to start MCP server.");
            return;
        }

        // Step 5: List servers to verify
        await ListMcpServersAsync(client);
        await GetActiveMcpServersAsync(client);

        // Step 6: Add MCP Agent
        Console.WriteLine("\n-------- Add MCP Agent --------");
        string mcpAgentMessage = @"
You execute ONE assigned task in a workflow.

INPUTS:
- ORIGINAL QUESTION: Full user request (if provided - gives context)
- DEPENDENCY OUTPUTS: Results from prerequisite tasks (if provided - your input data)
- YOUR TASK: What you must do (ONLY this)

INPUT PATTERNS:
Pattern 1 (First step - no dependencies):
- You receive: ORIGINAL QUESTION + YOUR TASK
- Use ORIGINAL QUESTION to understand what data/action YOUR TASK needs

Pattern 2 (Later step - has dependencies):
- You receive: DEPENDENCY OUTPUTS + YOUR TASK
- Use DEPENDENCY OUTPUTS as your input data
- ORIGINAL QUESTION may not be provided (you don't need it)

RULES:
- Use tools as needed to complete YOUR TASK
- If you have ORIGINAL QUESTION: understand context, but execute only YOUR TASK
- If you have DEPENDENCY OUTPUTS: use them as input for YOUR TASK
- Do not solve beyond YOUR TASK scope
- Stop when YOUR TASK is done

OUTPUT: When complete, simply report your results and say nothing else.
";

        var addedAgentName = await AddMcpAgentAsync(
            client,
            agentName,
            "Generate PDF file",
            mcpAgentMessage,
            serverName);

        if (string.IsNullOrEmpty(addedAgentName))
        {
            Console.WriteLine("Failed to add MCP agent.");
            return;
        }

        // Step 7: Start MCP Agent
        Console.WriteLine("\n-------- Start MCP Agent --------");
        var agentStarted = await StartMcpAgentAsync(client, addedAgentName);
        if (!agentStarted)
        {
            Console.WriteLine("Failed to start MCP agent.");
            return;
        }

        // Step 8: List agents to verify
        await ListMcpAgentsAsync(client);
        await GetActiveMcpAgentsAsync(client);

        // Step 9: Add files to Knowledge Base
        Console.WriteLine("\n-------- Add Files to Knowledge Base --------");
        string[] ragFiles = new[] {
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file1.txt")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file2.txt")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file3.txt"))
        };

        // Verify files exist
        foreach (var file in ragFiles)
        {
            if (!File.Exists(file))
            {
                Console.WriteLine($"WARNING: File not found: {file}");
            }
        }

        await AddFilesAsync(client, ragFiles);

        // Step 10: Run SuperAgent Chat
        Console.WriteLine("\n-------- SuperAgent RAG Chat --------");
        var request = new ChatRequest
        {
            Name = ClientName,
            Prompt = "What is the email of Celine Peter? Generate a pdf at C:\\temp\\IntelAia\\output.pdf",
            AttachedFiles = ToJsonArray(ragFiles),
            PromptOptions = new PromptOptions
            {
                SuperAgentPrompt = new PromptOptions.Types.SuperAgentPrompt()
            }
        };

        await StreamChatAsync(client, request, showReferences: true);
    }
    #endregion

    #region Helper Functions
    private static async Task StreamChatAsync(
        SuperBuilder.SuperBuilderClient client,
        ChatRequest request,
        bool showReferences = false)
    {
        var fullResponse = string.Empty;

        try
        {
            var stream = client.Chat(request);

            await foreach (var response in stream.ResponseStream.ReadAllAsync())
            {
                Console.Write(response.Message);
                fullResponse += response.Message;

                if (showReferences && response.References.Count > 0)
                {
                    Console.WriteLine("\n\nReferences:");
                    foreach (var r in response.References)
                    {
                        // For proto3 optional fields, check if default value (0 for int, empty for string)
                        var pageInfo = r.Page != 0 ? $", Page={r.Page}" : "";
                        var sheetInfo = !string.IsNullOrEmpty(r.Sheet) ? $", Sheet={r.Sheet}" : "";
                        Console.WriteLine($"  - File={r.File}{pageInfo}{sheetInfo}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nChat error: {ex.Message}");
            try
            {
                await client.StopChatAsync(new StopChatRequest());
            }
            catch
            {
                // Ignore errors when stopping
            }
        }
        finally
        {
            Console.WriteLine($"\n\n========== Full Response ==========\n{fullResponse}");
        }
    }

    private static string ToJsonArray(IEnumerable<string> values)
    {
        var escaped = values
            .Select(v => v.Replace("\\", "\\\\"))
            .Select(v => $"\"{v}\"");

        return $"[{string.Join(",", escaped)}]";
    }
    #endregion
}