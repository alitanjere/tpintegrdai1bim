import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Pagination from '../components/Pagination'
import EventCard from '../components/EventCard'
import { Plus, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const MyEvents = () => {
  const [createdEvents, setCreatedEvents] = useState([])
  const [enrolledEvents, setEnrolledEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const limit = 6

  useEffect(() => {
    fetchEvents(currentPage)
  }, [currentPage])

  const fetchEvents = async (page = 1) => {
    setLoading(true)
    try {
      const createdPromise = api.get('/event/my-events', {
        params: { limit, offset: (page - 1) * limit }
      })
      const enrolledPromise = api.get('/user/enrollments')

      const [createdResponse, enrolledResponse] = await Promise.all([
        createdPromise,
        enrolledPromise
      ])

      setCreatedEvents(createdResponse.data.collection)
      setTotalPages(Math.ceil(createdResponse.data.pagination.total / limit))
      setEnrolledEvents(enrolledResponse.data)
    } catch (error) {
      toast.error('Error al cargar los eventos')
      console.error('Error fetching events:', error)
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
      fetchEvents(currentPage)
    } catch (error) {
      const message = error.response?.data?.message || 'Error al eliminar el evento'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
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
      ) : (
        <>
          {/* Created Events */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Eventos Creados</h2>
            {createdEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No has creado ningún evento
                </h3>
                <p className="text-gray-500">
                  ¡Anímate a crear el primero!
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {createdEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      showActions
                      onDelete={handleDeleteEvent}
                    />
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  loading={loading}
                />
              </>
            )}
          </div>

          {/* Enrolled Events */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Eventos a los que asistiré</h2>
            {enrolledEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No estás inscrito en ningún evento
                </h3>
                <p className="text-gray-500">
                  Explora los eventos disponibles y únete a alguno
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MyEvents