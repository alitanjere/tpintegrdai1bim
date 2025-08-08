import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Pagination from '../components/Pagination'
import { MapPin, Users, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const EventLocations = () => {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const limit = 6

  useEffect(() => {
    fetchEventLocations(currentPage)
  }, [currentPage])

  const fetchEventLocations = async (page = 1) => {
    setLoading(true)
    try {
      const params = {
        limit,
        offset: (page - 1) * limit
      }

      const response = await api.get('/event-location', { params })
      setLocations(response.data.collection)
      setTotalPages(Math.ceil(response.data.pagination.total / limit))
    } catch (error) {
      toast.error('Error al cargar las ubicaciones')
      console.error('Error fetching event locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLocation = async (locationId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta ubicación?')) {
      return
    }

    setDeletingId(locationId)
    try {
      await api.delete(`/event-location/${locationId}`)
      toast.success('Ubicación eliminada exitosamente')
      fetchEventLocations(currentPage)
    } catch (error) {
      const message = error.response?.data?.message || 'Error al eliminar la ubicación'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Ubicaciones</h1>
        <Link to="/create-location" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nueva Ubicación</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-content">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No tienes ubicaciones creadas
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primera ubicación para poder organizar eventos
          </p>
          <Link to="/create-location" className="btn-primary">
            Crear Mi Primera Ubicación
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div key={location.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {location.name}
                  </h3>
                  <div className="flex space-x-2">
                    <Link
                      to={`/edit-location/${location.id}`}
                      className="btn-secondary px-3 py-2"
                      title="Editar ubicación"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      disabled={deletingId === location.id}
                      className="btn-danger px-3 py-2"
                      title="Eliminar ubicación"
                    >
                      {deletingId === location.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>{location.full_address}</div>
                      <div className="text-xs text-gray-500">
                        {location.location_name}, {location.province_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    Capacidad máxima: {location.max_capacity} personas
                  </div>
                </div>

                {location.latitude && location.longitude && (
                  <div className="text-xs text-gray-500 mb-4">
                    Coordenadas: {location.latitude}, {location.longitude}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Ubicación creada para organizar tus eventos
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        loading={loading}
      />
    </div>
  )
}

export default EventLocations