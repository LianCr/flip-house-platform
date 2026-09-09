import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.zh-CN';
import '@cloudscape-design/global-styles/index.css';
import './theme';
import App from './App';
import { MetaProvider } from './lib/meta';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider locale="zh-CN" messages={[messages]}>
      <MetaProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MetaProvider>
    </I18nProvider>
  </React.StrictMode>,
);
