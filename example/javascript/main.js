import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import fs from "fs";
import process from "process";

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const GRPC_SERVER_ADDRESS = "localhost:5006";
const CLIENT_NAME = "SuperBuilder - JavaScript Example";

/* ------------------------------------------------------------------ */
/* Proto loading */
/* ------------------------------------------------------------------ */

const PROTO_PATH = path.join(process.cwd(), "..", "shared", "superbuilder_service.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const SuperBuilder = proto.SuperBuilder;

/* ------------------------------------------------------------------ */
/* Channel / Client */
/* ------------------------------------------------------------------ */

function createGrpcClient() {
  return new SuperBuilder.SuperBuilder(
    GRPC_SERVER_ADDRESS,
    grpc.credentials.createInsecure()
  );
}

/* ------------------------------------------------------------------ */
/* Main */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("Connecting to SuperBuilder Middleware...");

  const client = createGrpcClient();

  await sayHello(client);
  await runSuperAgentRagChat(client);

  console.log("\n=== Done ===");
}

main().catch(console.error);

/* ------------------------------------------------------------------ */
/* Hello */
/* ------------------------------------------------------------------ */

function sayHello(client) {
  console.log("\n-------- Say Hello --------");

  return new Promise((resolve, reject) => {
    client.SayHello(
      { name: CLIENT_NAME },
      (err, response) => {
        if (err) {
          console.error("gRPC error:", err.message);
          return reject(err);
        }

        console.log(`Server Reply: ${response.message}`);
        resolve();
      }
    );
  });
}

/* ------------------------------------------------------------------ */
/* Add Files (server-streaming) */
/* ------------------------------------------------------------------ */

function addFiles(client, ragFiles) {
  return new Promise((resolve, reject) => {
    const request = {
      filesToUpload: toJsonArray(ragFiles),
    };

    const stream = client.AddFiles(request);

    stream.on("data", (response) => {
      if (response.currentFileUploading) {
        console.log(
          `Uploading ${response.currentFileUploading}: ${response.currentFileProgress}%`
        );
      }

      if (response.filesUploaded) {
        console.log(`Uploaded: ${response.filesUploaded}`);
      }
    });

    stream.on("error", (err) => {
      console.error("File upload failed:", err.message);
      reject(err);
    });

    stream.on("end", resolve);
  });
}

/* ------------------------------------------------------------------ */
/* MCP Management */
/* ------------------------------------------------------------------ */

function stopAndRemoveMcpAgent(client, agentName) {
  if (!agentName) {
    throw new Error("Agent name must be provided.");
  }

  return new Promise((resolve, reject) => {
    client.StopMCPAgent({ agentName }, (err, stopResp) => {
      if (err || !stopResp.success) {
        console.log(
          `Failed to stop agent '${agentName}': ${stopResp?.message}`
        );
        return resolve();
      }

      console.log(`Agent '${agentName}' stopped successfully.`);

      client.RemoveMCPAgent({ agentName }, (err2, removeResp) => {
        if (err2 || !removeResp.success) {
          console.log(
            `Failed to remove agent '${agentName}': ${removeResp?.message}`
          );
          return resolve();
        }

        console.log(`Agent '${agentName}' removed successfully.`);
        resolve();
      });
    });
  });
}

function addMcpServerAndGetId(client, name, command, args) {
  return new Promise((resolve, reject) => {
    client.AddMCPServer(
      {
        server: {
          ServerName: name,
          Command: command,
          Args: args,
        },
      },
      async (err, resp) => {
        if (err) return reject(err);

        console.log(`Add Server: ${resp.message}`);
        resolve(await getLatestMcpServerId(client, name));
      }
    );
  });
}

function getLatestMcpServerId(client, name) {
  return new Promise((resolve) => {
    client.GetMCPServers({}, (err, resp) => {
      if (err) return resolve(null);

      const matches = resp.servers
        .filter((s) => s.ServerName === name)
        .sort((a, b) => b.Id - a.Id);

      if (!matches.length) {
        console.log(`No MCP servers found with name '${name}'.`);
        return resolve(null);
      }

      console.log(
        `Latest Server: ID=${matches[0].Id}, Name=${matches[0].ServerName}`
      );

      resolve(matches[0].Id);
    });
  });
}

function startMcpAgent(client, agentName) {
console.log(`Starting Agent: ${agentName}`);
  return new Promise((resolve, reject) => {
    client.StartMCPAgent({ AgentName: agentName }, (err, resp) => {
      if (err) return reject(err);
      console.log(`Start Agent: ${resp.message}`);
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* SuperAgent RAG Chat */
/* ------------------------------------------------------------------ */

async function runSuperAgentRagChat(client) {
  console.log("\n-------- Remove Existing Agent --------");

  const agentName = "PDFAgent";
  await stopAndRemoveMcpAgent(client, agentName);

  console.log("\n-------- Add MCP Server --------");

  const mcpServerName = "mcp-server-pdf";
  const exePath = path.join(process.cwd(), "..", "shared", "mcp-server-pdf.exe");

  if (!fs.existsSync(exePath)) {
    console.error(`ERROR: MCP Server exe not found at ${exePath}`);
    return;
  }

  await new Promise((resolve) => {
    client.RemoveMCPServer(
      { serverName: mcpServerName },
      () => resolve()
    );
  });

  const serverId = await addMcpServerAndGetId(
    client,
    mcpServerName,
    exePath,
    "start"
  );

  if (!serverId) {
    console.error(`ERROR: MCP Server Id not found!`);
    return;
  }

  console.log("\n-------- Add MCP Agent --------");

  const agentMessage = `
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
        `;

  await new Promise((resolve, reject) => {
    client.AddMCPAgent(
      {
        agent: {
          name: agentName,
          desc: "Generate PDF file",
          message: agentMessage,
          server_ids: [serverId],
        },
      },
      (err, resp) => {
        if (err) return reject(err);
        console.log(`Add Agent: ${resp.message}`);
        resolve();
      }
    );
  });

  await startMcpAgent(client, agentName);

  console.log("\n-------- Add files to Knowledge Base --------");

  const ragFiles = [
    path.join(process.cwd(), "..", "shared", "file1.txt"),
    path.join(process.cwd(), "..", "shared", "file2.txt"),
    path.join(process.cwd(), "..", "shared", "file3.txt"),
  ];

  await addFiles(client, ragFiles);

  console.log("\n-------- SuperAgent RAG Chat --------");

  await streamChat(client, {
    name: CLIENT_NAME,
    prompt:
      "what is the email of Celine Peter? Generate a pdf C:\\temp\\IntelAia\\output.pdf",
    attachedFiles: toJsonArray(ragFiles),
    promptOptions: {
      superAgentPrompt: {},
    },
  });
}

/* ------------------------------------------------------------------ */
/* Streaming Chat */
/* ------------------------------------------------------------------ */

function streamChat(client, request) {
  return new Promise((resolve, reject) => {
    let fullResponse = "";

    const stream = client.Chat(request);

    stream.on("data", (resp) => {
      process.stdout.write(resp.message);
      fullResponse += resp.message;
    });

    stream.on("error", (err) => {
      console.error("Chat error:", err.message);
      client.StopChat({});
      reject(err);
    });

    stream.on("end", () => {
      console.log("\n\nFull response:\n" + fullResponse);
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function toJsonArray(values) {
  const escaped = values.map((v) => `"${v.replace(/\\/g, "\\\\")}"`);
  return `[${escaped.join(",")}]`;
}
