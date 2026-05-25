import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LiveRoomPage from './pages/LiveRoomPage'
import { ErrorBoundary } from './components/Common/ErrorBoundary'
import { initializeAgents } from './agents'

// Initialize multi-agent system once at app startup
initializeAgents()

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/live" element={<LiveRoomPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}