import 'regenerator-runtime/runtime'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'

import './index.scss'
import './PhaserGame'
import muiTheme from './MuiTheme'
import App from './App'
import store from './stores'

// react-redux 7's Provider type predates React 18's stricter JSX.ElementClass
// (it's missing `refs`), so @types/react 18 rejects it as a JSX component
// even though it works fine at runtime. Re-typed locally rather than
// bumping react-redux, which would be a behavior change, not a type fix.
const TypedProvider = Provider as unknown as React.ComponentType<{
  store: typeof store
  children?: React.ReactNode
}>

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(
  <React.StrictMode>
    <TypedProvider store={store}>
      <ThemeProvider theme={muiTheme}>
        <App />
      </ThemeProvider>
    </TypedProvider>
  </React.StrictMode>
)
