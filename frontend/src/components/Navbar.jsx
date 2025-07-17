import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, User, LogOut, Plus, MapPin } from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-blue-600">
            <Calendar className="w-6 h-6" />
            <span>EventApp</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/events" className="text-gray-700 hover:text-blue-600 transition-colors">
              Eventos
            </Link>
            
            {user ? (
              <>
                <Link to="/my-events" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Mis Eventos
                </Link>
                <Link to="/event-locations" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Mis Ubicaciones
                </Link>
                <div className="flex items-center space-x-4">
                  <Link to="/create-event" className="btn-primary flex items-center space-x-1">
                    <Plus className="w-4 h-4" />
                    <span>Crear Evento</span>
                  </Link>
                  <Link to="/create-location" className="btn-secondary flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>Nueva Ubicación</span>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="btn-primary">
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar