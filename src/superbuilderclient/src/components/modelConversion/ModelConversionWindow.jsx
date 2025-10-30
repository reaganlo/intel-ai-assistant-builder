import React from "react";
import ReactDOM from "react-dom/client";
import ModelConversion from "./ModelConversion";
import { initializeI18n } from '../../i18n';
import GlobalThemeProvider from "../themes/GlobalThemeProvider";

const startApp = async () => {
    await initializeI18n();
    ReactDOM.createRoot(document.getElementById("modelConversionWindow")).render(
        <GlobalThemeProvider>
            <ModelConversion />
        </GlobalThemeProvider>
    );
}

startApp();