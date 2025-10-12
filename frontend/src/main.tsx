import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './app/store';
import App from './App';
import './styles/tailwind.css';
import { injectStore, registerAuthListeners } from './services/http';
import { tokensRefreshed, logout } from './features/auth/authSlice';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider';

injectStore(store);
registerAuthListeners(
  (payload) => store.dispatch(tokensRefreshed(payload)),
  () => store.dispatch(logout())
);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <ConfirmDialogProvider>
              <App />
            </ConfirmDialogProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
