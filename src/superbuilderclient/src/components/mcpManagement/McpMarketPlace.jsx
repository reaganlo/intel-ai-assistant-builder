import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import useMcpStore from "../../stores/McpStore";
import useAppStore from "../../stores/AppStore";
import { ChatContext } from "../context/ChatContext";
import "./McpMarketPlace.css";
import mspLogo from "../../assets/images/msp.png";

const McpMarketPlace = ({ isOpen = false, onClose = () => {} }) => {
  const { t } = useTranslation();
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);

  const marketplaceServers = useMcpStore((state) => state.marketplaceServers);
  const marketplaceLoading = useMcpStore((state) => state.marketplaceLoading);
  const getMarketplaceServers = useMcpStore((state) => state.getMarketplaceServers);
  
  const [processingItems, setProcessingItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Filter servers based on search query
  const filteredServers = marketplaceServers.filter((item) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.chineseName?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.chineseDescription?.toLowerCase().includes(query) ||
      item.publisher?.toLowerCase().includes(query) ||
      item.keywords?.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // Fetch marketplace items from API
  useEffect(() => {
    if (isOpen) {
      getMarketplaceServers(1, 100, "", "", false);
    }
  }, [isOpen, getMarketplaceServers]);

  const handleInstall = async (item) => {
    if (!isChatReady) return;

    setProcessingItems((prev) => new Set(prev).add(item.id));
    setIsChatReady(false);

    try {
      console.debug("Getting Mcp server info for installation:", item.name);

      const serverinfo = await useMcpStore.getState().getModelScopeMcpServerById(item.id);


      if (serverinfo?.length > 0) { 
        
        await Promise.all(
          serverinfo.map(async (serverConfig) => {
            // Generate unique server name to avoid conflicts
            const uniqueServerName = useMcpStore.getState().generateMcpServerName(serverConfig.name, item.id);
            console.debug("Installing MCP Server:", uniqueServerName, "(original:", serverConfig.name, ")");
          
            // Set the input for the server
            useMcpStore.getState().setMcpInput({
              mcpServerName: uniqueServerName,
              mcpServerCommand: serverConfig.command,
              mcpServerCommandArgs: serverConfig.args ? serverConfig.args : [],
              mcpServerUrl: serverConfig.url ? serverConfig.url : "",
              mcpServerEnv: serverConfig.env ? serverConfig.env : "",
              mcpServerDisabled: false,
            });

            const response = await useMcpStore.getState().addMcpServer();

            if (response) {
              useAppStore
                .getState()
                .showNotification(
                  `Successfully installed "${uniqueServerName}"`,
                  "success"
                );
            }
          })
        );
      }

      


    } catch (error) {
      console.error("Failed to install MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to install "${item.name}": ${error}`,
          "error"
        );
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      setIsChatReady(true);
    }
  };

  const handleUninstall = async (item) => {
    if (!isChatReady) return;

    setProcessingItems((prev) => new Set(prev).add(item.id));
    setIsChatReady(false);

    try {
      console.debug("Uninstalling MCP Server:", item.name);
      
      // Get the actual server configurations for this marketplace item
      const marketplaceServersById = useMcpStore.getState().marketplaceServersById;
      let serverConfigs = marketplaceServersById[item.id];
      
      // If not cached, fetch the server details
      if (!serverConfigs || serverConfigs.length === 0) {
        console.debug("Fetching server details for uninstallation:", item.id);
        serverConfigs = await useMcpStore.getState().getModelScopeMcpServerById(item.id);
      }

      if (!serverConfigs || serverConfigs.length === 0) {
        throw new Error("Could not determine server configurations for this marketplace item");
      }

      // Find all installed servers that belong to this marketplace item
      const serversToUninstall = [];
      const runningServers = [];
      
      for (const serverConfig of serverConfigs) {
        // Generate the unique server name that was used during installation
        const uniqueServerName = useMcpStore.getState().generateMcpServerName(serverConfig.name, item.id);
        
        const installedServer = mcpServers.find(
          (server) => server.server_name === uniqueServerName
        );
        
        if (installedServer) {
          // Check if this server is running
          if (runningMcpServers.includes(uniqueServerName)) {
            runningServers.push(uniqueServerName);
          } else {
            serversToUninstall.push(installedServer);
          }
        }
      }

      // Check if any servers are running
      if (runningServers.length > 0) {
        useAppStore
          .getState()
          .showNotification(
            `Cannot uninstall "${item.name}". The following servers are running: ${runningServers.join(', ')}. Please stop them first.`,
            "warning"
          );
        return;
      }

      // Check if there are any servers to uninstall
      if (serversToUninstall.length === 0) {
        useAppStore
          .getState()
          .showNotification(
            `No installed servers found for "${item.name}"`,
            "info"
          );
        return;
      }

      // Uninstall all servers for this marketplace item
      console.debug(`Uninstalling ${serversToUninstall.length} server(s) for ${item.name}:`, 
        serversToUninstall.map(s => s.server_name));

      // Set selected servers for removal
      useMcpStore.getState().setSelectedMcpServer(serversToUninstall);
      useMcpStore.getState().setSelectedMcpServerId(serversToUninstall.map(s => s.id));

      const response = await useMcpStore.getState().removeMcpServer();

      if (response) {
        useAppStore
          .getState()
          .showNotification(
            `Successfully uninstalled "${item.name}" (${serversToUninstall.length} server${serversToUninstall.length > 1 ? 's' : ''})`,
            "success"
          );
        // Refresh the local server list which will also update marketplace installed status
        await useMcpStore.getState().getLocalMcpServers();
      }
    } catch (error) {
      console.error("Failed to uninstall MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to uninstall "${item.name}": ${error.message || error}`,
          "error"
        );
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      setIsChatReady(true);
    }
  };

  const handleRefresh = () => {
    // Force refresh - bypass cache
    getMarketplaceServers(1, 100, "", "", true);
    useMcpStore.getState().getLocalMcpServers();
  };

  return (
    <div className={`marketplace-panel ${isOpen ? "open" : ""}`}>
      <Box className="marketplace-container">
        {/* Header */}
        <Box className="marketplace-header">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            
            <Typography variant="h5" component="h1">
              {t("mcp.marketplace.title", "MCP Marketplace")}
            </Typography>
            <img 
              src={mspLogo} 
              alt="ModelScope" 
              style={{ width: 200, height: 50, objectFit: 'contain' }}
            />
          </Box>
          
          {/* Search Bar */}
          <Box className="marketplace-search-container">
            <TextField
              size="small"
              placeholder={t("mcp.marketplace.search", "Search by name, publisher, keywords...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-secondary-color, rgba(0, 0, 0, 0.02))',
                  fontSize: '0.875rem',
                },
                '& .MuiOutlinedInput-input': {
                  padding: '6px 8px',
                }
              }}
            />
            {!marketplaceLoading && searchQuery && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                {t("mcp.marketplace.showing_results", `Showing ${filteredServers.length} of ${marketplaceServers.length} items`)}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Tooltip title={t("mcp.marketplace.refresh", "Refresh Marketplace")}>
              <IconButton
                onClick={handleRefresh}
                disabled={marketplaceLoading}
                color="primary"
                size="medium"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("mcp.marketplace.close", "Close")}>
              <IconButton
                onClick={onClose}
                color="default"
                size="medium"
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box className="marketplace-content">

        {/* Loading State */}
        {marketplaceLoading && (
        <Box className="marketplace-loading">
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            {t("mcp.marketplace.loading", "Loading marketplace items...")}
          </Typography>
        </Box>
      )}

      {/* Marketplace Grid */}
      {!marketplaceLoading && (
        <Grid container spacing={2} className="marketplace-grid">
          {filteredServers.map((item) => {
            const isProcessing = processingItems.has(item.id);
            const isLoading = loadingMcpServers.includes(item.name);
            const isRunning = runningMcpServers.includes(item.name);

            return (
              <Grid item key={item.id}>
                <Card className={`marketplace-card ${item.installed ? "installed" : ""}`}>
                  <CardContent>
                    {/* Icon and Install Status */}
                    <Box className="card-header">
                      {item.icon && (
                        typeof item.icon === 'string' && item.icon.startsWith('http') ? (
                          <img 
                            src={item.icon} 
                            alt={item.name} 
                            className="card-icon-image"
                            style={{ width: 48, height: 48, objectFit: 'contain' }}
                          />
                        ) : (
                          <Typography className="card-icon">{item.icon}</Typography>
                        )
                      )}
                      {item.installed && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={t("mcp.marketplace.installed", "Installed")}
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>

                    {/* Name */}
                    <Typography variant="h6" component="h2" className="card-title">
                      <a 
                        href={`https://www.modelscope.cn/mcp/servers/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: 'inherit', 
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {item.name}
                      </a>
                    </Typography>

                    {/* Publisher */}
                    {item.publisher && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {t("mcp.marketplace.by", "by")} {item.publisher}
                      </Typography>
                    )}

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="card-description"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {(() => {
                        // Clean description: remove markdown image syntax, badges, and extra markup
                        const desc = item.description || item.chineseDescription || t("mcp.marketplace.no_description", "No description available");
                        return desc
                          .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
                          .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '') // Remove badge links
                          .replace(/\[.*?\]\(.*?\)/g, '') // Remove other markdown links
                          .replace(/^#+\s*/gm, '') // Remove markdown headers
                          .replace(/\n+/g, ' ') // Replace newlines with spaces
                          .trim();
                      })()}
                    </Typography>

                    {/* View Count */}
                    {item.viewCount !== undefined && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        👁️ {item.viewCount.toLocaleString()} {t("mcp.marketplace.views", "views")}
                      </Typography>
                    )}

                    {/* Keywords */}
                    <Box className="card-keywords">
                      {item.keywords.slice(0, 3).map((keyword) => (
                        <Chip
                          key={keyword}
                          label={keyword}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {item.keywords.length > 3 && (
                        <Chip
                          label={`+${item.keywords.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>

                  {/* Actions */}
                  <CardActions className="card-actions">
                    {item.installed ? (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        disabled={
                          !isChatReady ||
                          isProcessing ||
                          isLoading ||
                          isRunning
                        }
                        onClick={() => handleUninstall(item)}
                      >
                        {isProcessing ? (
                          <>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            {t("mcp.marketplace.uninstalling", "Uninstalling...")}
                          </>
                        ) : isRunning ? (
                          t("mcp.marketplace.running", "Running")
                        ) : (
                          t("mcp.marketplace.uninstall", "Uninstall")
                        )}
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!isChatReady || isProcessing}
                        onClick={() => handleInstall(item)}
                      >
                        {isProcessing ? (
                          <>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            {t("mcp.marketplace.installing", "Installing...")}
                          </>
                        ) : (
                          t("mcp.marketplace.install", "Install")
                        )}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Empty State */}
      {!marketplaceLoading && filteredServers.length === 0 && (
        <Box className="marketplace-empty">
          <SearchIcon sx={{ fontSize: 64, opacity: 0.3 }} />
          <Typography variant="h6" sx={{ mt: 2, opacity: 0.6 }}>
            {searchQuery 
              ? t("mcp.marketplace.no_results", `No results found for "${searchQuery}"`)
              : t("mcp.marketplace.empty", "No marketplace items available")}
          </Typography>
          {searchQuery && (
            <Button 
              variant="text" 
              onClick={() => setSearchQuery("")}
              sx={{ mt: 1 }}
            >
              {t("mcp.marketplace.clear_search", "Clear search")}
            </Button>
          )}
        </Box>
      )}
        </Box>
        {/* End Scrollable Content */}
      </Box>
    </div>
  );
};

export default McpMarketPlace;
