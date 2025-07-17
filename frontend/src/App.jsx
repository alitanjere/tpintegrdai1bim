import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import MyEvents from './pages/MyEvents'
import CreateEvent from './pages/CreateEvent'
import EventLocations from './pages/EventLocations'
import CreateEventLocation from './pages/CreateEventLocation'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/my-events" element={
            <ProtectedRoute>
              <MyEvents />
            </ProtectedRoute>
          } />
          <Route path="/create-event" element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } />
          <Route path="/event-locations" element={
            <ProtectedRoute>
              <EventLocations />
            </ProtectedRoute>
          } />
          <Route path="/create-location" element={
            <ProtectedRoute>
              <CreateEventLocation />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default App