import React from "react";
import ReactDOM from "react-dom/client";
import EmailForm from "./Email";
import { initializeI18n } from '../../i18n';
import GlobalThemeProvider from "../themes/GlobalThemeProvider";
import App from "../App"; // DO NOT REMOVE (not an unused import)

const startApp = async () => {
  await initializeI18n();

  ReactDOM.createRoot(document.getElementById("EmailWindow")).render(
    <React.StrictMode>
      <GlobalThemeProvider>
        <EmailForm/>
      </GlobalThemeProvider>
    </React.StrictMode>,
  );
}

startApp();