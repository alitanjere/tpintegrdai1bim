import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import Pagination from '../components/Pagination'
import { Calendar, MapPin, DollarSign, Users, Edit, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

const MyEvents = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const limit = 6

  useEffect(() => {
    fetchMyEvents(currentPage)
  }, [currentPage])

  const fetchMyEvents = async (page = 1) => {
    setLoading(true)
    try {
      const params = {
        limit,
        offset: (page - 1) * limit
      }

      // Get all events and filter by creator (since API doesn't have a "my events" endpoint)
      const response = await api.get('/event', { params })
      const myEvents = response.data.collection.filter(event => 
        event.creator_user.id === user.id
      )
      
      setEvents(myEvents)
      // Note: This pagination won't be accurate since we're filtering client-side
      // In a real app, you'd want a dedicated "my events" endpoint
      setTotalPages(Math.ceil(myEvents.length / limit))
    } catch (error) {
      toast.error('Error al cargar tus eventos')
      console.error('Error fetching my events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      return
    }

    setDeletingId(eventId)
    try {
      await api.delete(`/event/${eventId}`)
      toast.success('Evento eliminado exitosamente')
      fetchMyEvents(currentPage)
    } catch (error) {
      const message = error.response?.data?.message || 'Error al eliminar el evento'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Eventos</h1>
        <Link to="/create-event" className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Crear Evento</span>
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
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No tienes eventos creados
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primer evento y comienza a organizar experiencias increíbles
          </p>
          <Link to="/create-event" className="btn-primary">
            Crear Mi Primer Evento
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="card hover:shadow-lg transition-shadow">
              <div className="card-content">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {event.name}
                  </h3>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(event.price)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(event.start_date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {event.event_location.name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    Máx. {event.max_assistance} personas
                  </div>
                </div>

                {event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {event.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex space-x-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="btn-secondary flex-1 text-center text-sm"
                  >
                    Ver Detalles
                  </Link>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={deletingId === event.id}
                    className="btn-danger px-3"
                    title="Eliminar evento"
                  >
                    {deletingId === event.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
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

export default MyEvents