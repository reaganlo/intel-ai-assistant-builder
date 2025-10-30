import "./Sidebar.css";
import React, { useState, useEffect, useContext, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatContext } from "../context/ChatContext";
import { WorkflowContext } from "../context/WorkflowContext";
import useDataStore from "../../stores/DataStore";
import useMcpStore from "../../stores/McpStore";
import SettingsIcon from "@mui/icons-material/Settings";
import NewWorkflowIcon from "@mui/icons-material/AddCircle";
import HistoryIcon from "@mui/icons-material/History";
import AdminIcon from "@mui/icons-material/ManageAccounts";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CloudIcon from "@mui/icons-material/Cloud";
// import mcpLogo from '../../assets/images/mcp-logo.svg'; 
import { useTranslation } from "react-i18next";
import McpManagement from "../mcpManagement/McpManagement";
import McpMarketPlace from "../mcpManagement/McpMarketPlace";
import { ChatHistory } from "./ChatHistory";
import WorkflowOptions from "../workflows/WorkflowOptions";
import SidebarOverlay from "./SidebarOverlay";
import Setting from "../setting/Setting";

const Sidebar = ({}) => {
  const { t } = useTranslation();
  const { config, getDBConfig } = useDataStore();
  const { newSession, isChatReady, newChatModelNeeded } = useContext(ChatContext);
  const {
    workflowSidebarVisible: isWorkflowOpen,
    setWorkflowSidebarVisible: setIsWorkflowOpen,
  } = useContext(WorkflowContext);
  const [isSettingOpen, setIsSettingOpen] = useState(false); // setting popout panel
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // chat history popout panel
  const sidebarRef = useRef(null);
  const [settingVisibility, setSettingVisibility] = useState(false);
  const mcpMarketplaceOpen = useMcpStore((state) => state.mcpMarketplaceOpen);
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);

  const handleSetAdmin = async () => {
    const shallowNewData = Object.keys(config).reduce((acc, key) => {
      if (typeof config[key] !== "object" || config[key] === null) {
        acc[key] = config[key];
      }
      return acc;
    }, {});
    shallowNewData.is_admin = !config.is_admin;
    const viewModel = JSON.stringify(shallowNewData);
    await invoke("set_user_config_view_model", { vm: viewModel });
    getDBConfig();
  };

  const handleHistory = () => {
    setIsSettingOpen(false);
    setIsWorkflowOpen(false);
    setIsHistoryOpen(!isHistoryOpen);
    // Close marketplace when opening history
    useMcpStore.getState().closeMcpMarketplace();
  };

  const handleSetting = () => {
    setIsHistoryOpen(false);
    setIsWorkflowOpen(false);
    setIsSettingOpen(!isSettingOpen);
    // Close marketplace when opening settings
    useMcpStore.getState().closeMcpMarketplace();
  };

  const handleWorkflow = () => {
    setIsHistoryOpen(false);
    setIsSettingOpen(false);
    setIsWorkflowOpen(!isWorkflowOpen);
    // Close marketplace when opening workflow
    useMcpStore.getState().closeMcpMarketplace();
  };

  const handleMarketplace = () => {
    if (mcpMarketplaceOpen) {
      useMcpStore.getState().closeMcpMarketplace();
    } else {
      useMcpStore.getState().openMcpMarketplace();
    }
  };

  const handleManagement = () => {
    if (mcpManagementOpen) {
      useMcpStore.getState().closeMcpManagement();
    } else {
      useMcpStore.getState().openMcpManagement();
    }
  };

  const closePanels = () => {
    setIsSettingOpen(false);
    setIsHistoryOpen(false);
    setIsWorkflowOpen(false);
    useMcpStore.getState().closeMcpMarketplace();
    useMcpStore.getState().closeMcpManagement();
  };

  useEffect(() => {
    setSettingVisibility(config.is_admin);
  }, [config]);

  useEffect(() => {
    if (isChatReady == false && newChatModelNeeded == true && isSettingOpen == false) {
      handleSetting();
    }
  }, [isChatReady, newChatModelNeeded, isSettingOpen]);

  const isOpen = isSettingOpen || isHistoryOpen || isWorkflowOpen || mcpMarketplaceOpen || mcpManagementOpen;

  const SidebarBox = ({
    isChatReady,
    toggleSetting,
    toggleHistory,
    toggleWorkflow,
    toggleMarketplace,
    toggleManagement,
    settingVisibility,
  }) => {
    const { t } = useTranslation();
    
    const SidebarButton = ({title, icon, onClick, additionalClasses=""}) => {
      return (
        <button 
          title={title}
          className={`sidebar-button ` + additionalClasses}
          onClick={onClick}
          disabled={!isChatReady}
        >
          {icon}
        </button>
      ); 
    }

    return (
      <div className="sidebarbox">
        <SidebarButton
          additionalClasses="new-chat-button"
          title={t('sidebar.new_chat')}
          onClick={() => {
            if (isChatReady) {
              toggleWorkflow();
            }
          }}
          icon={<NewWorkflowIcon className="sidebar-icon" color="primary" sx={{fontSize: "50px"}}/>}
        />
        <SidebarButton
          title={t('sidebar.chat_history')}
          onClick={() => {
            if (isChatReady) {
              toggleHistory();
            }
          }}
          icon={<HistoryIcon className="sidebar-icon" fontSize="large"/>}
        />
        <SidebarButton
          title={t("sidebar.mcp_marketplace", "MCP Marketplace")}
          onClick={toggleMarketplace}
          icon={<CloudIcon className="sidebar-icon" fontSize="large"/>}
        />
        <SidebarButton
          title={t("sidebar.mcp_management", "MCP Management")}
          onClick={toggleManagement}
          icon={<StorefrontIcon className="sidebar-icon" fontSize="large"/>}
        />
        <div className="spacer"></div>
        <div className="admin">
          <SidebarButton
            title={t('sidebar.admin_mode') + ' - '  + (config.is_admin ? t('sidebar.mode_enable') : t('sidebar.mode_disable'))}
            onClick={handleSetAdmin}
            icon={<AdminIcon className="sidebar-icon" fontSize="large"/>}
          />
        </div>
        {settingVisibility && (
          <SidebarButton
            title={t('sidebar.setting')}
            onClick={toggleSetting}
            icon={<SettingsIcon className="sidebar-icon" fontSize="large"/>}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="overlay" onClick={closePanels} />}
      <div className="sidebar-container" ref={sidebarRef}>
        <SidebarBox
          isChatReady={isChatReady}
          newSession={newSession}
          isSettingOpen={isSettingOpen}
          toggleSetting={() => handleSetting()}
          isHistoryOpen={isHistoryOpen}
          toggleHistory={() => handleHistory()}
          isWorkflowOpen={isWorkflowOpen}
          toggleWorkflow={() => handleWorkflow()}
          toggleMarketplace={() => handleMarketplace()}
          toggleManagement={() => handleManagement()}
          settingVisibility={settingVisibility}
        />
        <Setting
          isOpen={isSettingOpen}
          setIsOpen={setIsSettingOpen}
          onClose={() => setIsSettingOpen(false)}
        />
        <ChatHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
        <McpMarketPlace
          isOpen={mcpMarketplaceOpen}
          onClose={() => {
            if (isChatReady) {
              useMcpStore.getState().closeMcpMarketplace();
            }
          }}
        />
        {mcpManagementOpen && (
          <McpManagement
            isSidebarOpen={mcpManagementOpen}
            closePanels={() => {
              if (isChatReady) {
                useMcpStore.getState().closeMcpManagement();
              }
            }}
          />
        )}
        <SidebarOverlay
          isOpen={isWorkflowOpen}
          onClose={() => {
            if (isChatReady) {
              setIsWorkflowOpen(false);
            }
          }}
          content={
            <WorkflowOptions
              onWorkflowSelected={() => {
                setIsWorkflowOpen(false)
                // if (mcpManagementOpen) {
                //   useMcpStore.getState().closeMcpManagement();
                // }
              }}
            />
          }
        />
      </div>
    </>
  );
};

export default Sidebar;

