import { createContext, useState } from 'react';

const AppStatusContext = createContext({
  closing: false,
  setClosing: () => {},
  isAppReady: false,
  setIsAppReady: () => {},
});

const AppStatusProvider = ({ children }) => {
 const [closing, setClosing] = useState();
 const [isAppReady, setIsAppReady] = useState(false);

 return (
   <AppStatusContext.Provider value={
      { 
        closing,
        setClosing,
        isAppReady,
        setIsAppReady, 
      }
    }>
     {children}
   </AppStatusContext.Provider>
 );
};

export { AppStatusContext, AppStatusProvider };