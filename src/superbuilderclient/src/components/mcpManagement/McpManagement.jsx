import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import ArrowCircleLeft from "@mui/icons-material/ArrowCircleLeft";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Autocomplete from "@mui/material/Autocomplete";
import "./McpManagement.css";
import McpAgentTable from "./McpAgentTable";
import McpServerTable from "./McpServerTable";
import FluidModal from "../FluidModal/FluidModal";
import useDataStore from "../../stores/DataStore";
import useMcpStore from "../../stores/McpStore";
import { useTranslation } from "react-i18next";
import { ChatContext } from "../context/ChatContext";
import { McpTableHeader } from "./mcpTableShared";

const McpManagement = ({ isSidebarOpen = false, closePanels = () => {} }) => {
  const { t } = useTranslation();
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const assistant = useDataStore((state) => state.assistant);
  
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
  const mcpAgents = useMcpStore((state) => state.mcpAgents);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const selectedMcpServerId = useMcpStore((state) => state.selectedMcpServerId);
  const selectedMcpServer = useMcpStore((state) => state.selectedMcpServer);
  const mcpInputOpen = useMcpStore((state) => state.mcpInputOpen);
  const mcpInputType = useMcpStore((state) => state.mcpInputType);
  const mcpInputSource = useMcpStore((state) => state.mcpInputSource);
  const mcpInput = useMcpStore((state) => state.mcpInput);
  const mcpServerTools = useMcpStore((state) => state.mcpServerTools);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);
  const fetchingMcpServerTools = useMcpStore(
    (state) => state.fetchingMcpServerTools
  );
  const mcpAgentInput = useMcpStore((state) => state.mcpAgentInput);
  const mcpAgentInputOpen = useMcpStore((state) => state.mcpAgentInputOpen);
  const mcpAgentInputType = useMcpStore((state) => state.mcpAgentInputType);
  const mcpRemoveModalOpen = useMcpStore((state) => state.mcpRemoveModalOpen);
  const mcpRemoveType = useMcpStore((state) => state.mcpRemoveType);

  const [mcpInputError, setMcpServerInputError] = useState({});
  const [mcpAgentInputError, setMcpAgentInputError] = useState({});
  const [layoutMode, setLayoutMode] = useState("vertical"); // "vertical" or "horizontal"
  const [verticalSplitPercent, setVerticalSplitPercent] = useState(null); // null = not yet calculated
  const [horizontalSplitPercent, setHorizontalSplitPercent] = useState(50); // 50% default for horizontal
  const [isResizing, setIsResizing] = useState(false);
  const [hasCalculatedInitialSplit, setHasCalculatedInitialSplit] = useState(false); // Track if we've done initial calculation with data
  const [isLoadingData, setIsLoadingData] = useState(false); // Track if initial data is being loaded
  const runningMcpAgents = useMcpStore((state) => state.runningMcpAgents);
  const loadingMcpAgents = useMcpStore((state) => state.loadingMcpAgents);

  const refreshTrigger = useMcpStore((state) => state.refreshTrigger);

  const DEBUG_LAYOUT = false;

  // Calculate initial vertical split based on Agent table content
  // This runs whenever mcpAgents or mcpServers updates (after fetch completes)
  useEffect(() => {
    // Only calculate once, triggered by the first data update after opening the panel
    // The refreshTrigger ensures we recalculate if data is refreshed
    if (!hasCalculatedInitialSplit && mcpManagementOpen) {
      // DataGrid constants
      const HEADER_HEIGHT = 40; // Column header height
      const ROW_HEIGHT = 42; // Each row height
      const FOOTER_HEIGHT = 44; // Pagination footer
      const TABLE_HEADER_HEIGHT = 34; // McpTableHeader component height
      const RESIZE_HANDLE_HEIGHT = 6; // Resize handle height
      const GAP_HEIGHT = 12; // Gap between tables (combined with resize handle)
      const MARGIN_BOTTOM = 8; // Margin bottom of table container
      
      // App layout constants
      const APP_TITLE_BAR = 48; // App title bar height
      const PAGE_TOP_SECTION = 36; // Back button and toggle section (marginBottom: 8px)
      const PADDING = 20; // Container padding
      
      // Calculate Agent table minimum height
      // Using pageSize from pagination (default 10 rows)
      const defaultPageSize = 10;
      const numVisibleRows = mcpAgents.length === 0 ? 1 : Math.min(defaultPageSize, mcpAgents.length);
      const numVisibleServerRows = mcpServers.length === 0 ? 1 : Math.min(defaultPageSize, mcpServers.length);
      
      const agentTableMinHeight = 
        TABLE_HEADER_HEIGHT + 
        HEADER_HEIGHT + 
        numVisibleRows * ROW_HEIGHT + 
        FOOTER_HEIGHT + 
        MARGIN_BOTTOM;
      
      // Calculate available container height from window height
      const windowHeight = window.innerHeight;
      const totalOverhead = APP_TITLE_BAR + PAGE_TOP_SECTION + PADDING + GAP_HEIGHT + RESIZE_HANDLE_HEIGHT;
      const availableHeight = windowHeight - totalOverhead;
      
      // Calculate percentage (agent table height / total available height)
      let calculatedPercent = (agentTableMinHeight / availableHeight) * 100;
      
      // Ensure both tables have enough space (min 200px each for DataGrid to function properly)
      const minTableHeight = 200;
      const minPercent = (minTableHeight / availableHeight) * 100;
      const maxPercent = 100 - minPercent;
      
      calculatedPercent = Math.max(minPercent, Math.min(maxPercent, calculatedPercent));
      
      const agentTableActualHeight = availableHeight * calculatedPercent / 100;
      const serverTableActualHeight = availableHeight * (100 - calculatedPercent) / 100;
      
      if (DEBUG_LAYOUT) {
        console.log('=== Vertical Layout Height Calculation ===');
        console.log('Window height:', windowHeight);
        console.log('App overhead:', totalOverhead);
        console.log('Available height:', availableHeight);
        console.log('Agent data rows:', mcpAgents.length, '(allocating space for', numVisibleRows, 'rows)');
        console.log('Server data rows:', mcpServers.length, '(allocating space for', numVisibleServerRows, 'rows)');
        console.log('Agent table min height needed:', agentTableMinHeight + 'px');
        console.log('Calculated percent:', calculatedPercent.toFixed(2) + '%');
        console.log('Agent table actual height:', agentTableActualHeight.toFixed(0) + 'px');
        console.log('Server table actual height:', serverTableActualHeight.toFixed(0) + 'px');
        console.log('Min table height enforced:', minTableHeight + 'px');
      }
      
      setVerticalSplitPercent(calculatedPercent);
      setHasCalculatedInitialSplit(true); // Mark that we've done the initial calculation
    }
  }, [mcpAgents, mcpServers, hasCalculatedInitialSplit, mcpManagementOpen, refreshTrigger]);

  // Helper function to create table container styles
  const createTableContainerStyle = (verticalCalcOffset) => ({
    height: layoutMode === "horizontal" 
      ? "85%"
      : `calc(100% - ${verticalCalcOffset}px)`, 
    minHeight: "200px", // Minimum height for DataGrid to function
    overflow: "auto", 
    marginBottom: layoutMode === "horizontal" ? "8px" : "0"
  });

  useEffect(() => {
    if (mcpManagementOpen) {
      // Reset calculation flag when refreshing data
      setHasCalculatedInitialSplit(false);
      setVerticalSplitPercent(null);
      setIsLoadingData(true);
      
      // Load data asynchronously
      // When getMcpAgent() and getLocalMcpServers() complete, they update the store
      // which will trigger the calculation useEffect below (since mcpAgents/mcpServers are dependencies)
      const loadData = async () => {
        await Promise.all([
          useMcpStore.getState().getMcpAgent(),
          useMcpStore.getState().getActiveMcpAgents(),
          useMcpStore.getState().getLocalMcpServers(),
          useMcpStore.getState().getActiveMcpServers()
        ]);
        setIsLoadingData(false);
      };
      
      loadData();
    }
  }, [mcpManagementOpen, refreshTrigger]);

  useEffect(() => {
    if (mcpInputOpen) {
      setMcpServerInputError({
        mcpServerName: false,
        mcpServerNameDuplicate: false,
        mcpServerCommand: false,
        mcpServerCommandArgs: false,
        mcpServerUrl: false,
        mcpServerEnv: false,
      });
    }
  }, [mcpInputOpen]);

  useEffect(() => {
    if (mcpAgentInputOpen) {
      setMcpAgentInputError({
        agentName: false,
        agentNameDuplicate: false,
        description: false,
        systemMessage: false,
        mcpServerIds: false,
      });
    }
  }, [mcpAgentInputOpen]);

  // Resize handlers
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (layoutMode === "horizontal") {
        const container = document.querySelector('.tables-container.horizontal');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const mouseX = e.clientX - containerRect.left;
        const newWidthPercent = (mouseX / containerWidth) * 100;
        
        // Calculate min width in percentage (300px minimum for each panel)
        const minWidthPercent = (300 / containerWidth) * 100;
        const maxWidthPercent = 100 - minWidthPercent;
        
        // Constrain between min and max to ensure both panels stay at least 300px
        if (newWidthPercent >= minWidthPercent && newWidthPercent <= maxWidthPercent) {
          setHorizontalSplitPercent(newWidthPercent);
        }
      } else if (layoutMode === "vertical") {
        const container = document.querySelector('.tables-container.vertical');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const mouseY = e.clientY - containerRect.top;
        const newHeightPercent = (mouseY / containerHeight) * 100;
        
        // Calculate min height in percentage (250px minimum for each panel, accounting for gap)
        const gap = 12; // gap between panels in pixels
        const minHeightPx = 250;
        const minHeightPercent = ((minHeightPx + gap) / containerHeight) * 100;
        const maxHeightPercent = 100 - minHeightPercent;
        
        // Constrain between min and max to ensure both panels stay at least 250px
        if (newHeightPercent >= minHeightPercent && newHeightPercent <= maxHeightPercent) {
          setVerticalSplitPercent(newHeightPercent);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      return () => {
        document.body.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, layoutMode]);

  const handleInputSourceChange = (source) => {
    useMcpStore.getState().setMcpInputSource(source);
    if (source === "command") {
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerUrl: "",
        mcpServerEnv: "",
      });
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerUrl: false,
      }));
    } else {
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerCommand: "",
        mcpServerCommandArgs: "",
        mcpServerEnv: "",
      });
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerCommand: false,
        mcpServerCommandArgs: false,
      }));
    }
  };

  const handleManagementUIClose = () => {
    useMcpStore.getState().closeMcpManagement();
  };

  const handleInputModalClose = () => {
    useMcpStore.getState().closeMcpInput();
  };

  const handleInputModalOpen = (type) => {
    useMcpStore.getState().openMcpInput(type, "url");
    if (type === "Add") {
      useMcpStore.getState().setMcpInput({
        mcpServerName: "",
        mcpServerCommand: "",
        mcpServerCommandArgs: "",
        mcpServerUrl: "",
        mcpServerEnv: "",
        mcpServerDisabled: false,
      });
    }
  };

  const handleAgentInputModalClose = () => {
    useMcpStore.getState().closeMcpAgentInput();
  };

  const handleAgentInputModalOpen = (type) => {
    useMcpStore.getState().openMcpAgentInput(type);
    if (type === "Add") {
      useMcpStore.getState().setMcpAgentInput({
        agentName: "",
        description: "",
        systemMessage:
          "You are a helpful assistant who first analyzes the ultimate needs of the customer. Then, you select the appropriate tool or multiple tools based on the needs and solve them step by step until the user's ultimate needs are met.",
        mcpServerIds: [], // Initialize as empty array
      });
    }
  };

  const handleMcpServerSubmit = (type) => {
    setIsChatReady(false);
    // Validate input before submission
    if (!Object.values(mcpInputError).every((v) => v === false)) {
      return;
    }

    // Strip double quotes from mcpServerCommand
    if (
      mcpInputSource === "command" &&
      typeof mcpInput.mcpServerCommand === "string"
    ) {
      const strippedCommand = mcpInput.mcpServerCommand.replace(/^"+|"+$/g, "");
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerCommand: strippedCommand,
      });
    }

    let result;
    if (type === "Add") {
      result = useMcpStore.getState().addMcpServer();
    } else {
      result = useMcpStore.getState().updateMcpServer();
    }

    if (result) {
      setIsChatReady(true);
    }
    useMcpStore.getState().closeMcpInput();
  };

  const namePattern = /^[A-Za-z0-9_-]+$/;

  const handleInputChange = (field) => (event) => {
    const value =
      field !== "mcpServerDisabled" ? event.target.value : event.target.checked;

    if (field === "mcpServerName") {
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerNameDuplicate: mcpServers.some(
          (server) => server.server_name === value.trim()
        ),
        mcpServerName: !value.trim(),
        mcpServerNameInvalid: value.trim() && !namePattern.test(value.trim()),
      }));
    }

    if (mcpInputSource === "url") {
      if (field === "mcpServerUrl") {
        if (!value.trim()) {
          setMcpServerInputError((prev) => ({
            ...prev,
            mcpServerUrl: true,
          }));
        } else {
          try {
            new URL(value);
            setMcpServerInputError((prev) => ({
              ...prev,
              mcpServerUrl: false,
            }));
          } catch (e) {
            setMcpServerInputError((prev) => ({
              ...prev,
              mcpServerUrl: true,
            }));
          }
        }
      }
    } else if (mcpInputSource === "command") {
      if (field === "mcpServerCommand") {
        setMcpServerInputError((prev) => ({
          ...prev,
          [field]: !value.trim(),
        }));
      }
    }

    // Add validation for environment variables format
    if (field === "mcpServerEnv") {
      // Validate environment variable format (KEY=VALUE or KEY:VALUE)
      if (value.trim() && !value.match(/^[A-Z_][A-Z0-9_]*[:=].+$/i)) {
        setMcpServerInputError((prev) => ({
          ...prev,
          mcpServerEnv: true,
        }));
      } else {
        setMcpServerInputError((prev) => ({
          ...prev,
          mcpServerEnv: false,
        }));
      }
    }

    useMcpStore.getState().setMcpInput({
      ...mcpInput,
      [field]: value,
    });
  };

  const handleRemoveMcpServer = () => {
    setIsChatReady(false);
    useMcpStore.getState().removeMcpServer();
    setIsChatReady(true);
  };

  const handleMcpAgentSubmit = (type) => {
    setIsChatReady(false);

    if (!Object.values(mcpAgentInputError).every((v) => v === false)) {
      return;
    }

    let result;
    if (type === "Add") {
      result = useMcpStore.getState().addMcpAgent();
    } else {
      result = useMcpStore.getState().updateMcpAgent();
    }

    if (result) {
      setIsChatReady(true);
    }

    useMcpStore.getState().closeMcpAgentInput();
  };

  const handleAgentInputChange = (field) => (event) => {
    const value = event.target.value;

    if (field === "agentName") {
      setMcpAgentInputError((prev) => ({
        ...prev,
        agentNameDuplicate: mcpAgents.some(
          (agent) => agent.name === value.trim()
        ),
        agentName: !value.trim(),
        agentNameInvalid: value.trim() && !namePattern.test(value.trim()),
      }));
    } else {
      setMcpAgentInputError((prev) => ({
        ...prev,
        [field]: !value.trim(),
      }));
    }

    useMcpStore.getState().setMcpAgentInput({
      ...mcpAgentInput,
      [field]: value,
    });
  };

  const handleRemoveMcpAgent = () => {
    setIsChatReady(false);
    useMcpStore.getState().removeMcpAgent();
    setIsChatReady(true);
  };

  // Render vertical layout (Agent table on top, Server table on bottom)
  const renderVerticalLayout = () => {
    // Use default 40% if calculation hasn't completed yet
    const topPanelHeight = verticalSplitPercent !== null ? verticalSplitPercent : 40;
    
    return (
      <Box
        className="tables-container vertical"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "auto",
        }}
      >
        {/* Agent Table */}
        <Box 
          className="filebox"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: "0 0 auto",
            height: `${topPanelHeight}%`,
            minHeight: "200px",
            overflow: "auto",
          }}
        >
          <McpTableHeader
            title={t("mcp.agent_table.title", "MCP Agents")}
            onAdd={() => handleAgentInputModalOpen("Add")}
            addDisabled={!isChatReady}
            showRemove={false}
            addButtonText={t("mcp.ui.add_agent_button")}
          />
          <Box sx={createTableContainerStyle(34)}>
            <McpAgentTable />
          </Box>
        </Box>

        {/* Resize Handle - Vertical */}
        <Box
          className="resize-handle resize-handle-vertical"
          onMouseDown={handleMouseDown}
          sx={{
            height: "6px",
            minHeight: "6px",
            cursor: "row-resize",
            backgroundColor: "var(--divider-color)",
            position: "relative",
            flexShrink: 0,
            zIndex: 1000,
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: "var(--primary-color)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "40px",
              height: "2px",
              backgroundColor: "var(--text-secondary-color)",
              borderRadius: "1px",
              opacity: 0.5,
            },
          }}
        />

        {/* Server Table */}
        <Box 
          className="filebox"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: "0 0 auto",
            height: `${100 - topPanelHeight}%`,
            minHeight: "200px",
            overflow: "auto",
          }}
        >
          <McpTableHeader
            title={t("mcp.server_table.title", "MCP Servers")}
            onAdd={() => handleInputModalOpen("Add")}
            onRemove={() => {
              useMcpStore.getState().setMcpRemoveType("server");
              useMcpStore.getState().setMcpRemoveModalOpen(true);
            }}
            addDisabled={!isChatReady || loadingMcpServers.length > 0}
            removeDisabled={
              !isChatReady ||
              selectedMcpServer.length === 0 ||
              (selectedMcpServer.length > 0 &&
                (selectedMcpServer.some((server) =>
                  runningMcpServers.includes(server.server_name)
                ) ||
                  selectedMcpServerId.some((id) =>
                    mcpAgents.some((agent) => agent.server_ids.includes(id))
                  )))
            }
            addButtonText={t("mcp.ui.add")}
            removeButtonText={t("mcp.ui.remove")}
          />
          <Box sx={createTableContainerStyle(34)}>
            <McpServerTable />
          </Box>
        </Box>
      </Box>
    );
  };

  // Render horizontal layout (Agent table on left, Server table on right)
  const renderHorizontalLayout = () => {
    return (
      <Box
        className="tables-container horizontal"
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 0,
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Agent Table */}
        <Box 
          className="filebox resizable-left"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: "none",
            width: `${horizontalSplitPercent}%`,
            height: "100%",
          }}
        >
          <McpTableHeader
            title={t("mcp.agent_table.title", "MCP Agents")}
            onAdd={() => handleAgentInputModalOpen("Add")}
            addDisabled={!isChatReady}
            showRemove={false}
            addButtonText={t("mcp.ui.add_agent_button")}
          />
          <Box sx={createTableContainerStyle(34)}>
            <McpAgentTable layoutMode="horizontal" />
          </Box>
        </Box>

        {/* Resize Handle - Horizontal */}
        <Box
          className="resize-handle resize-handle-horizontal"
          onMouseDown={handleMouseDown}
          sx={{
            width: "6px",
            minWidth: "6px",
            cursor: "col-resize",
            backgroundColor: "var(--divider-color)",
            position: "relative",
            flexShrink: 0,
            zIndex: 1000,
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: "var(--primary-color)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "2px",
              height: "40px",
              backgroundColor: "var(--text-secondary-color)",
              borderRadius: "1px",
              opacity: 0.5,
            },
          }}
        />

        {/* Server Table */}
        <Box 
          className="filebox resizable-right"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: "none",
            width: `${100 - horizontalSplitPercent}%`,
            height: "100%",
          }}
        >
          <McpTableHeader
            title={t("mcp.server_table.title", "MCP Servers")}
            onAdd={() => handleInputModalOpen("Add")}
            onRemove={() => {
              useMcpStore.getState().setMcpRemoveType("server");
              useMcpStore.getState().setMcpRemoveModalOpen(true);
            }}
            addDisabled={!isChatReady || loadingMcpServers.length > 0}
            removeDisabled={
              !isChatReady ||
              selectedMcpServer.length === 0 ||
              (selectedMcpServer.length > 0 &&
                (selectedMcpServer.some((server) =>
                  runningMcpServers.includes(server.server_name)
                ) ||
                  selectedMcpServerId.some((id) =>
                    mcpAgents.some((agent) => agent.server_ids.includes(id))
                  )))
            }
            addButtonText={t("mcp.ui.add")}
            removeButtonText={t("mcp.ui.remove")}
          />
          <Box sx={createTableContainerStyle(34)}>
            <McpServerTable layoutMode="horizontal" />
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <>
      {isSidebarOpen && <div onClick={closePanels} />}
      <div className="mcp-modal-overlay" onClick={(e) => e.stopPropagation()}>
        <Box
          sx={{
            justifyContent: "space-between",
            display: "flex",
            marginBottom: "8px",
          }}
        >
          <Button
            variant="contained"
            className="close-button"
            onClick={handleManagementUIClose}
            sx={{ height: "28px", gap: "8px", fontSize: "13px" }}
          >
            <ArrowCircleLeft sx={{ fontSize: "18px" }} />
            {t("mcp.ui.back")}
          </Button>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <ToggleButtonGroup
              value={layoutMode}
              exclusive
              onChange={(e, newMode) => newMode && setLayoutMode(newMode)}
              size="small"
              sx={{ height: "28px" }}
            >
              <ToggleButton value="vertical" aria-label="vertical layout" sx={{ fontSize: "12px", padding: "4px 8px" }}>
                <ViewAgendaIcon sx={{ fontSize: "16px", marginRight: "4px" }} />
                Vertical
              </ToggleButton>
              <ToggleButton value="horizontal" aria-label="horizontal layout" sx={{ fontSize: "12px", padding: "4px 8px" }}>
                <ViewColumnIcon sx={{ fontSize: "16px", marginRight: "4px" }} />
                Side by Side
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Tables Container */}
        <Box
          className={`${isResizing ? "resizing" : ""}`}
          sx={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            cursor: isResizing ? (layoutMode === "vertical" ? "row-resize" : "col-resize") : "default",
            userSelect: isResizing ? "none" : "auto",
          }}
        >
          {isLoadingData ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <CircularProgress size={60} />
              <Typography variant="body1" color="text.secondary">
                {t("mcp.ui.loading", "Loading MCP data...")}
              </Typography>
            </Box>
          ) : (
            layoutMode === "vertical" ? renderVerticalLayout() : renderHorizontalLayout()
          )}
        </Box>
      </div>

      {/* Remove Modal */}
      <FluidModal
        open={mcpRemoveModalOpen}
        handleClose={() => useMcpStore.getState().setMcpRemoveModalOpen(false)}
        header={
          <strong>
            {t("mcp.ui.confirm_remove")}{" "}
            {mcpRemoveType === "server"
              ? t("mcp.ui.mcp_server")
              : t("mcp.ui.mcp_agent")}
          </strong>
        }
        width="40%"
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button
                  size="m"
                  variant="text"
                  onClick={() => {
                    useMcpStore.getState().setMcpRemoveModalOpen(false);

                    if (mcpRemoveType === "agent") {
                      useMcpStore.getState().setSelectedMcpAgent([]);
                    }
                  }}
                >
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  sx={{ backgroundColor: "#c73d3d" }}
                  onClick={() => {
                    if (mcpRemoveType === "server") {
                      handleRemoveMcpServer();
                    } else {
                      handleRemoveMcpAgent();
                    }
                    useMcpStore.getState().setMcpRemoveModalOpen(false);
                  }}
                >
                  {t("mcp.ui.remove_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <div className="mcpmodal-content">
              <Typography component="div">
                {t("mcp.ui.confirm_remove_message")}{" "}
                {mcpRemoveType === "server"
                  ? t("mcp.ui.mcp_server")
                  : t("mcp.ui.mcp_agent")}
                <br />
                {mcpRemoveType === "server" ? (
                  <ul>
                    {useMcpStore.getState().selectedMcpServer.map((server) => (
                      <li key={server.server_name}>{server.server_name}</li>
                    ))}
                  </ul>
                ) : (
                  <ul>
                    {useMcpStore.getState().selectedMcpAgent.map((agent) => (
                      <li key={agent.name}>{agent.name}</li>
                    ))}
                  </ul>
                )}
              </Typography>
            </div>
          </div>
        </div>
      </FluidModal>

      {/* MCP Agent Modal */}
      <FluidModal
        open={mcpAgentInputOpen}
        handleClose={handleAgentInputModalClose}
        header={
          <strong>
            {mcpAgentInputType === "Add"
              ? t("mcp.ui.add_agent")
              : t("mcp.ui.edit_agent")}
          </strong>
        }
        width="50%"
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button
                  size="m"
                  variant="text"
                  onClick={handleAgentInputModalClose}
                >
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  onClick={() => handleMcpAgentSubmit(mcpAgentInputType)}
                  disabled={
                    Object.values(mcpAgentInputError).some(
                      (error) => error === true
                    ) ||
                    !(mcpAgentInput.agentName ?? "").trim() ||
                    !(mcpAgentInput.description ?? "").trim() ||
                    !(mcpAgentInput.systemMessage ?? "").trim() ||
                    !Array.isArray(mcpAgentInput.mcpServerIds) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName)
                  }
                >
                  {mcpAgentInputType === "Add"
                    ? t("mcp.ui.add_button")
                    : t("mcp.ui.save_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_name")}
              </Typography>
              <TextField
                value={mcpAgentInput.agentName}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("agentName")}
                fullWidth
                error={
                  mcpAgentInputError.agentName ||
                  mcpAgentInputError.agentNameDuplicate ||
                  mcpAgentInputError.agentNameInvalid
                }
                helperText={
                  mcpAgentInputError.agentName
                    ? "MCP Agent Name is required"
                    : mcpAgentInputError.agentNameDuplicate
                    ? "MCP Agent Name already exists"
                    : mcpAgentInputError.agentNameInvalid
                    ? "Only letters, numbers, dashes, and underscores are allowed"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_description")}
              </Typography>
              <TextField
                value={mcpAgentInput.description}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("description")}
                fullWidth
                error={mcpAgentInputError.description}
                helperText={
                  mcpAgentInputError.description
                    ? "MCP Agent Description is required"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_system_prompt")}
              </Typography>
              <TextField
                value={mcpAgentInput.systemMessage}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("systemMessage")}
                fullWidth
                error={mcpAgentInputError.systemMessage}
                helperText={
                  mcpAgentInputError.systemMessage
                    ? "MCP Agent System Prompt is required"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                {t("mcp.ui.mcp_agent_mcp_server", "MCP Servers")}
              </Typography>
              <FormControl fullWidth>
                <Autocomplete
                  multiple
                  options={mcpServers}
                  getOptionLabel={(option) => option.server_name}
                  value={
                    Array.isArray(mcpAgentInput.mcpServerIds) &&
                    mcpAgentInput.mcpServerIds.length > 0
                      ? mcpServers.filter((server) =>
                          mcpAgentInput.mcpServerIds.includes(server.id)
                        )
                      : []
                  }
                  disabled={
                    mcpAgentInputType === "Update" &&
                    (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                      runningMcpAgents.includes(mcpAgentInput.agentName))
                  }
                  onChange={(_, selected) => {
                    useMcpStore.getState().setMcpAgentInput({
                      ...mcpAgentInput,
                      mcpServerIds: selected.map((server) => server.id), // Store as array of numbers
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder={t("mcp.ui.mcp_agent_mcp_server_placeholder")}
                      helperText={
                        mcpAgentInput.mcpServerIds.length === 0
                          ? t("mcp.ui.mcp_agent_mcp_server_note")
                          : ""
                      }
                    />
                  )}
                />
              </FormControl>
            </div>
          </div>
        </div>
      </FluidModal>

      {/* MCP Server Modal */}
      <FluidModal
        open={mcpInputOpen}
        handleClose={handleInputModalClose}
        header={
          <strong>
            {mcpInputType === "Add" ? t("mcp.ui.add") : t("mcp.ui.edit")}
          </strong>
        }
        width={mcpInputType === "Add" ? "40%" : "80%"}
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button size="m" variant="text" onClick={handleInputModalClose}>
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  onClick={() => handleMcpServerSubmit(mcpInputType)}
                  disabled={
                    Object.values(mcpInputError).some(
                      (error) => error === true
                    ) ||
                    !(mcpInput.mcpServerName ?? "").trim() ||
                    (mcpInputSource === "url" &&
                      !(mcpInput.mcpServerUrl ?? "").trim()) ||
                    (mcpInputSource === "command" &&
                      !(mcpInput.mcpServerCommand ?? "").trim()) ||
                    loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName)
                  }
                >
                  {mcpInputType === "Add"
                    ? t("mcp.ui.add_button")
                    : t("mcp.ui.save_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <FormControl
              component="fieldset"
              className="small-form-control"
              disabled={
                mcpInputType === "Update" &&
                (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                  runningMcpServers.includes(mcpInput.mcpServerName))
              }
            >
              <div
                className="radio-group-with-label"
                sx={{ display: "flex", width: "100%" }}
              >
                <RadioGroup
                  row
                  aria-label="model"
                  name="model"
                  value={mcpInputSource}
                  onChange={(e) => handleInputSourceChange(e.target.value)}
                >
                  <FormControlLabel
                    value="url"
                    control={<Radio color={"default"} />}
                    label={t("mcp.ui.url_radio")}
                  />
                  <FormControlLabel
                    value="command"
                    control={<Radio color={"default"} />}
                    label={t("mcp.ui.command_radio")}
                  />
                </RadioGroup>
              </div>
            </FormControl>

            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_server_name")}
              </Typography>
              <TextField
                value={mcpInput.mcpServerName}
                placeholder=""
                onChange={handleInputChange("mcpServerName")}
                fullWidth
                disabled={
                  mcpInputType === "Update" &&
                  (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName))
                }
                error={
                  mcpInputError.mcpServerName ||
                  mcpInputError.mcpServerNameDuplicate ||
                  mcpInputError.mcpServerNameInvalid
                }
                helperText={
                  mcpInputError.mcpServerName
                    ? "MCP Server Name is required"
                    : mcpInputError.mcpServerNameDuplicate
                    ? "MCP Server Name already exists"
                    : mcpInputError.mcpServerNameInvalid
                    ? "Only letters, numbers, dashes, and underscores are allowed"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            {mcpInputSource === "command" ? (
              <>
                <div className="mcpmodal-content">
                  <Typography>
                    <span style={{ color: "red" }}>*</span>{" "}
                    {t("mcp.ui.mcp_server_command")}
                  </Typography>
                  <TextField
                    value={mcpInput.mcpServerCommand}
                    placeholder="e.g. docker"
                    onChange={handleInputChange("mcpServerCommand")}
                    fullWidth
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    error={mcpInputError.mcpServerCommand}
                    helperText={
                      mcpInputError.mcpServerCommand
                        ? "MCP Server Command is required"
                        : ""
                    }
                    slotProps={{
                      formHelperText: {
                        sx: { color: "red" },
                      },
                    }}
                  />
                </div>
                <div className="mcpmodal-content">
                  <Typography>{t("mcp.ui.mcp_server_command_args")}</Typography>
                  <TextField
                    value={mcpInput.mcpServerCommandArgs}
                    placeholder="e.g. run -i --rm mcp/time"
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    onChange={handleInputChange("mcpServerCommandArgs")}
                    fullWidth
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mcpmodal-content">
                  <Typography>
                    <span style={{ color: "red" }}>*</span>{" "}
                    {t("mcp.ui.mcp_server_url")}
                  </Typography>
                  <TextField
                    value={mcpInput.mcpServerUrl}
                    placeholder="e.g. http://127.0.0.1:3008/sse"
                    onChange={handleInputChange("mcpServerUrl")}
                    fullWidth
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    error={mcpInputError.mcpServerUrl}
                    helperText={
                      mcpInputError.mcpServerUrl
                        ? !mcpInput.mcpServerUrl.trim()
                          ? "MCP Server URL is required"
                          : "MCP Server URL is invalid"
                        : ""
                    }
                    slotProps={{
                      formHelperText: {
                        sx: { color: "red" },
                      },
                    }}
                  />
                </div>
              </>
            )}
            <div className="mcpmodal-content">
              <Typography>{t("mcp.ui.mcp_server_env")}</Typography>
              <TextField
                value={mcpInput.mcpServerEnv}
                placeholder={t("mcp.ui.mcp_server_env_placeholder")}
                onChange={handleInputChange("mcpServerEnv")}
                fullWidth
                disabled={
                  mcpInputType === "Update" &&
                  (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName))
                }
                error={mcpInputError.mcpServerEnv}
                helperText={
                  mcpInputError.mcpServerEnv
                    ? t("mcp.ui.mcp_server_env_error")
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            {/* <div className="mcpmodal-content">
              <FormControlLabel
                sx={{ display: "flex" }}
                label={t("mcp.ui.disabled_checkbox")}
                control={
                  <Checkbox
                    checked={mcpInput.mcpServerDisabled}
                    onChange={handleInputChange("mcpServerDisabled")}
                  />
                }
              />
            </div> */}
          </div>
          {mcpInputType === "Update" && (
            <div className="mcpmodal-container">
              <Typography>{t("mcp.ui.mcp_server_info")}</Typography>
              <div className="mcpmodal-metadata">
                {mcpServerTools.length > 0 ? (
                  mcpServerTools.map((tool, index) => (
                    <div key={index} className="mcpmodal-metadata-tool">
                      <div>
                        <strong>{tool.name}</strong>
                      </div>
                      <div>{tool.description}</div>
                    </div>
                  ))
                ) : fetchingMcpServerTools ? (
                  <div>{t("mcp.ui.mcp_server_info_fetching")}</div>
                ) : (
                  <div>{t("mcp.ui.mcp_server_info_empty")}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </FluidModal>
    </>
  );
};

export default McpManagement;
