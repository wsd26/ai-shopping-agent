import { HashRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LiveRoomPage from './pages/LiveRoomPage'
import { ErrorBoundary } from './components/Common/ErrorBoundary'
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/live" element={<LiveRoomPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
