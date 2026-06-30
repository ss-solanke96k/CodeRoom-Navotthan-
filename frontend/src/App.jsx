import React from 'react';
import { Provider } from 'react-redux';
import { store } from './shared/store/index.js';
import AppRouter from './routing/AppRouter.jsx';

function App() {
  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

export default App;
