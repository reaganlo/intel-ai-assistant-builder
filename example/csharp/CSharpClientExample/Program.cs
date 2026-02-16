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

    private static async Task AddOrReplaceMcpServerAsync(
        SuperBuilder.SuperBuilderClient client,
        string serverName,
        string command,
        string args)
    {
        var server = new MCPServer
        {
            Name = serverName,
            Command = command,
            Args = args
        };

        try
        {
            await client.AddMCPServerAsync(new AddMCPServerRequest
            {
                Server = server
            });

            Console.WriteLine($"MCP Server '{serverName}' added successfully.");
        }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.AlreadyExists)
        {
            Console.WriteLine($"MCP Server '{serverName}' already exists. Replacing...");

            await StopAndRemoveServerAsync(client, serverName);

            await client.AddMCPServerAsync(new AddMCPServerRequest
            {
                Server = server
            });

            Console.WriteLine($"MCP Server '{serverName}' re-added successfully.");
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"gRPC error managing MCP server '{serverName}': {ex.Status.Detail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Unexpected error managing MCP server '{serverName}': {ex.Message}");
        }
    }

    private static async Task StopAndRemoveServerAsync(
        SuperBuilder.SuperBuilderClient client,
        string serverName)
    {
        try
        {
            await client.StopMCPServerAsync(new StopMCPServerRequest
            {
                ServerName = serverName
            });
        }
        catch (RpcException ex) when (
            ex.StatusCode == StatusCode.NotFound ||
            ex.StatusCode == StatusCode.FailedPrecondition)
        {
            // Ignore if already stopped or not found
        }

        await client.RemoveMCPServerAsync(new RemoveMCPServerRequest
        {
            ServerName = serverName
        });
    }

    private static async Task AddOrReplaceMcpAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName,
        string desc,
        string message,
        params string[] serverNames)
    {
        var agent = new MCPAgent
        {
            Name = agentName,
            Desc = desc,
            Message = message
        };

        agent.ServerNames.AddRange(serverNames);

        try
        {
            await client.AddMCPAgentAsync(new AddMCPAgentRequest
            {
                Agent = agent
            });

            Console.WriteLine($"MCP Agent '{agentName}' added successfully.");
        }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.AlreadyExists)
        {
            Console.WriteLine($"MCP Agent '{agentName}' already exists. Replacing...");

            await StopAndRemoveAgentAsync(client, agentName);

            await client.AddMCPAgentAsync(new AddMCPAgentRequest
            {
                Agent = agent
            });

            Console.WriteLine($"MCP Agent '{agentName}' re-added successfully.");
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"gRPC error managing MCP agent '{agentName}': {ex.Status.Detail}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Unexpected error managing MCP agent '{agentName}': {ex.Message}");
        }
    }

    private static async Task StopAndRemoveAgentAsync(
        SuperBuilder.SuperBuilderClient client,
        string agentName)
    {
        try
        {
            await client.StopMCPAgentAsync(new StopMCPAgentRequest
            {
                AgentName = agentName
            });
        }
        catch (RpcException ex) when (
            ex.StatusCode == StatusCode.NotFound ||
            ex.StatusCode == StatusCode.FailedPrecondition)
        {
            // Ignore if already stopped or not found
        }

        await client.RemoveMCPAgentAsync(new RemoveMCPAgentRequest
        {
            AgentName = agentName
        });
    }

    #endregion

    #region SuperAgent RAG Chat
    private static async Task RunSuperAgentRAGChatAsync(
        SuperBuilder.SuperBuilderClient client)
    {
        Console.WriteLine("\n======== SuperAgent RAG Chat Setup ========");

        const string agentName = "PDFAgent";
        const string mcpServerName = "mcp-server-pdf";

        // Add MCP Server (removes and re-adds if already exists)
        Console.WriteLine("\n-------- Setup MCP Server --------");
        var mcpServerExePath = Path.GetFullPath(Path.Combine(
            Directory.GetCurrentDirectory(), "..", "..", "shared", "mcp-server-pdf.exe"));

        if (!File.Exists(mcpServerExePath))
        {
            Console.WriteLine($"ERROR: MCP Server exe not found at {mcpServerExePath}");
            return;
        }

        await AddOrReplaceMcpServerAsync(client, mcpServerName, mcpServerExePath, "start");

        // Start MCP Server
        var startServerResponse = await client.StartMCPServerAsync(
            new StartMCPServerRequest { ServerName = mcpServerName });
        Console.WriteLine($"Start Server: {startServerResponse.Message}");

        // Add MCP Agent (removes and re-adds if already exists)
        Console.WriteLine("\n-------- Setup MCP Agent --------");
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

        await AddOrReplaceMcpAgentAsync(
            client,
            agentName,
            "Generate PDF file",
            mcpAgentMessage,
            mcpServerName);

        // Start MCP Agent
        var startAgentResponse = await client.StartMCPAgentAsync(
            new StartMCPAgentRequest { AgentName = agentName });
        Console.WriteLine($"Start Agent: {startAgentResponse.Message}");

        // Add files to Knowledge Base
        Console.WriteLine("\n-------- Add Files to Knowledge Base --------");
        string[] ragFiles = new[] {
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file1.txt")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file2.txt")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "shared", "file3.txt"))
        };

        await AddFilesAsync(client, ragFiles);

        // Run SuperAgent Chat
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

        await StreamChatAsync(client, request);
    }
    #endregion

    #region Helper Functions
    private static async Task StreamChatAsync(
        SuperBuilder.SuperBuilderClient client,
        ChatRequest request)
    {
        var fullResponse = string.Empty;

        try
        {
            var stream = client.Chat(request);

            await foreach (var response in stream.ResponseStream.ReadAllAsync())
            {
                Console.Write(response.Message);
                fullResponse += response.Message;

                if (response.References.Count > 0)
                {
                    Console.WriteLine("\n\nReferences:");
                    foreach (var r in response.References)
                    {
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
            catch { /* Ignore */ }
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