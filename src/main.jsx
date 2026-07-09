import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Central data-fetching cache for the whole admin app.
// - staleTime: how long fetched data is considered "fresh". Revisiting a
//   page within this window reuses the cached data instead of re-hitting
//   the API, which is what was causing avoidable load on the backend.
// - refetchOnWindowFocus/refetchOnReconnect: off, so switching browser
//   tabs or a flaky connection doesn't silently trigger extra requests.
// - retry: 1, so a transient error/429 gets one retry instead of hammering
//   the API repeatedly.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
