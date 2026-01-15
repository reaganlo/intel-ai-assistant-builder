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

    #region Upload File
    private static async Task UploadFileAsync(
        SuperBuilder.SuperBuilderClient client,
        string filePath)
    {
        Console.WriteLine($"Uploading file: {filePath}");

        var request = new AddFilesRequest
        {
            FilesToUpload = ToJsonArray(filePath)
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
    private static async Task RemoveMcpServersByNameAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpServerName)
    {
        var response = await client.GetMCPServersAsync(new GetMCPServersRequest());

        // Case-sensitive, exact match
        var matchingServers = response.Servers
            .Where(s => string.Equals(s.ServerName, mcpServerName, StringComparison.Ordinal))
            .ToList();

        if (!matchingServers.Any())
        {
            Console.WriteLine($"No MCP servers found with name '{mcpServerName}'.");
            return;
        }

        foreach (var server in matchingServers)
        {
            Console.WriteLine($"Removing MCP Server: ID={server.Id}, Name={server.ServerName}");

            await client.RemoveMCPServerAsync(
                new RemoveMCPServerRequest
                {
                    ServerName = server.ServerName
                });
        }

        Console.WriteLine($"Removed {matchingServers.Count} MCP server(s) with name '{mcpServerName}'.");
    }

    private static async Task<int?> AddMcpServerAndGetIdAsync(
        SuperBuilder.SuperBuilderClient client, string mcpServerName, string command, string args)
    {
        var addResponse = await client.AddMCPServerAsync(new AddMCPServerRequest
        {
            Server = new MCPServer
            {
                ServerName = mcpServerName,
                Command = command,
                Args = args
            }
        });

        Console.WriteLine($"Add Server: {addResponse.Message}");

        return await GetLatestMcpServerIdAsync(client, mcpServerName);
    }

    private static async Task<int?> GetLatestMcpServerIdAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpServerName)
    {
        var response = await client.GetMCPServersAsync(new GetMCPServersRequest());

        var latestServer = response.Servers
            .Where(s => s.ServerName == mcpServerName)   // case-sensitive match
            .OrderByDescending(s => s.Id)
            .FirstOrDefault();

        if (latestServer == null)
        {
            Console.WriteLine($"No MCP servers found with name '{mcpServerName}'.");
            return null;
        }

        Console.WriteLine(
            $"Latest Server: ID={latestServer.Id}, Name={latestServer.ServerName}");

        return latestServer.Id;
    }

    private static async Task StopAndRemoveMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName)
    {
        if (string.IsNullOrWhiteSpace(agentName))
        {
            throw new ArgumentException("Agent name must be provided.", nameof(agentName));
        }

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
            return;
        }

        Console.WriteLine(
            $"Agent '{agentName}' stopped successfully.");

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
            return;
        }

        Console.WriteLine(
            $"Agent '{agentName}' removed successfully.");
    }

    private static async Task<int?> AddMcpAgentAndGetIdAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpAgentName,
        string desc,
        string message,
        int mcpServerId)
    {
        var addResponse = await client.AddMCPAgentAsync(
            new AddMCPAgentRequest
            {
                Agent = new MCPAgent
                {
                    Name = mcpAgentName,
                    Desc = desc,
                    Message = message,
                    ServerIds = { mcpServerId } // repeated field
                }
            });

        Console.WriteLine($"Add Agent: {addResponse.Message}");

        return await GetLatestMcpAgentIdAsync(client, mcpAgentName);
    }

    private static async Task<int?> GetLatestMcpAgentIdAsync(
        SuperBuilder.SuperBuilderClient client,
        string mcpAgentName)
    {
        var response = await client.GetMCPAgentsAsync(
            new GetMCPAgentsRequest());

        var latestAgent = response.Agents
            .Where(a => a.Name == mcpAgentName) // Using Name property per proto
            .OrderByDescending(a => a.Id)
            .FirstOrDefault();

        if (latestAgent == null)
        {
            Console.WriteLine(
                $"No MCP Agents found with name '{mcpAgentName}'.");
            return null;
        }

        Console.WriteLine(
            $"Latest Agent: ID={latestAgent.Id}, Name={latestAgent.Name}");

        return latestAgent.Id;
    }


    private static async Task StartMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName)
    {
        var response = await client.StartMCPAgentAsync(new StartMCPAgentRequest
        {
            AgentName = agentName
        });

        Console.WriteLine($"Start Agent: {response.Message}");
    }
    #endregion

    #region SuperAgent RAG Chat
    private static async Task RunSuperAgentRAGChatAsync(
        SuperBuilder.SuperBuilderClient client)
    {
        Console.WriteLine("\n-------- Remove Existing Agent --------");

        const string agentName = "PDFAgent";
        await StopAndRemoveMcpAgentAsync(client, agentName);

        Console.WriteLine("\n-------- Add MCP Server --------");

        var mcpServerName = "mcp-server-pdf";
        var mcpServerExePath = Path.Combine(
            Directory.GetCurrentDirectory(), "mcp_server_pdf-mcp-server.exe");

        if (!File.Exists(mcpServerExePath))
        {
            Console.WriteLine($"ERROR: MCP Server exe not found at {mcpServerExePath}");
            return;
        }

        var mcpArgs = "start";

        // Remove MCP servers by name
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
                $"Successfully removed MCP server(s) named '{mcpServerName}'");
        }

        // Add the MCP Server
        var latestServerId = await AddMcpServerAndGetIdAsync(
            client, mcpServerName, mcpServerExePath, mcpArgs);

        if (!latestServerId.HasValue)
        {
            Console.WriteLine("Failed to determine latest MCP server ID.");
            return;
        }

        Console.WriteLine($"Latest MCP Server ID: {latestServerId.Value}");

        Console.WriteLine("\n-------- Add MCP Agent --------");

        // Add MCP Agent
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

        var addAgentResponse = await client.AddMCPAgentAsync(
            new AddMCPAgentRequest
            {
                Agent = new MCPAgent
                {
                    Name = agentName,
                    Desc = "Generate PDF file",
                    Message = mcpAgentMessage,
                    ServerIds = { latestServerId.Value }
                }
            });

        Console.WriteLine($"Add Agent: {addAgentResponse.Message}");

        // Start agent
        await StartMcpAgentAsync(client, agentName);

        // List servers
        Console.WriteLine("\n-------- List MCP Servers --------");
        var listResponse = await client.GetMCPServersAsync(
            new GetMCPServersRequest());

        foreach (var server in listResponse.Servers)
        {
            Console.WriteLine(
                $"ID={server.Id}, Name={server.ServerName}, Cmd={server.Command}");
        }

        Console.WriteLine("\n-------- SuperAgent RAG Chat --------");

        var ragFilePath = Path.Combine(
            Directory.GetCurrentDirectory(), "RajeshKrishnan-Resume.txt");

        if (!File.Exists(ragFilePath))
        {
            Console.WriteLine($"ERROR: RAG file not found at {ragFilePath}");
            return;
        }

        await UploadFileAsync(client, ragFilePath);

        var request = new ChatRequest
        {
            Name = ClientName,
            Prompt =
                "What is the work experience? Generate a pdf C:\\temp\\IntelAia\\output.pdf",
            AttachedFiles = ToJsonArray(ragFilePath),
            PromptOptions = new PromptOptions
            {
                SuperAgentPrompt =
                    new PromptOptions.Types.SuperAgentPrompt()
            }
        };

        await StreamChatAsync(client, request);
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
                    Console.WriteLine("\nReferences:");
                    foreach (var r in response.References)
                    {
                        Console.WriteLine($"- {r.File}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Chat error: {ex.Message}");
            client.StopChat(new StopChatRequest());
        }
        finally
        {
            Console.WriteLine($"\n\nFull response:\n{fullResponse}");
        }
    }

    private static string ToJsonArray(string value) =>
        $"[\"{value.Replace("\\", "\\\\")}\"]";
    #endregion
}