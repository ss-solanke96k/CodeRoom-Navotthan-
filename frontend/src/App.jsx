import React from 'react';
import { Provider } from 'react-redux';
import { store } from './shared/store/index.js';
import AppRouter from './routing/AppRouter.jsx';

export default function App() {
  return (
    <Provider store={store}>
      <div className="w-full min-h-screen bg-[#0e0e1e] selection:bg-indigo-500/30 selection:text-white">
        <AppRouter />
      </div>
    </Provider>
  );
}
