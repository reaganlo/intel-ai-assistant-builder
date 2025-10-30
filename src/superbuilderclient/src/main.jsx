import React from "react";
import ReactDOM from "react-dom/client";
// Default Roboto fonts (always loaded for English/fallback)
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from "./components/App";
import {initializeI18n} from './i18n';
import { RagReadyProvider } from "./components/context/RagReadyContext";
import { ChatProvider } from "./components/context/ChatContext";
import { AppStatusProvider } from "./components/context/AppStatusContext";
import { EmailWindowProvider } from "./components/context/EmailWindowContext";
import { ModelDownloaderProvider } from "./components/context/ModelDownloaderContext";
import { FileManagementProvider } from "./components/context/FileManagementContext";
import { WorkflowContextProvider } from "./components/context/WorkflowContext";

const startApp = async () => {
  await initializeI18n();
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
  // <React.StrictMode>
    <AppStatusProvider>
        <WorkflowContextProvider>
          <RagReadyProvider>
            <ChatProvider>
              <EmailWindowProvider>
                <ModelDownloaderProvider>
                  <FileManagementProvider>
                      <App />
                  </FileManagementProvider>
                </ModelDownloaderProvider>
              </EmailWindowProvider>
            </ChatProvider>
          </RagReadyProvider>
        </WorkflowContextProvider>
      </AppStatusProvider>
    // </React.StrictMode>
  );
};

startApp();
