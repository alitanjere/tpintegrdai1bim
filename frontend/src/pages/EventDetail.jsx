import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { Calendar, MapPin, DollarSign, Users, Clock, User, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const EventDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      try {
        const eventResponse = await api.get(`/event/${id}`)
        setEvent(eventResponse.data)

        if (user) {
          // This is not ideal, a dedicated endpoint would be better.
          // For now, we fetch all enrollments for the user.
          const enrollmentsResponse = await api.get('/user/enrollments');
          const isUserEnrolled = enrollmentsResponse.data.some(enrollment => enrollment.id_event === parseInt(id));
          setIsEnrolled(isUserEnrolled);
        }
      } catch (error) {
        toast.error('Error al cargar el evento')
        navigate('/events')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id, user, navigate])

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para inscribirte')
      navigate('/login')
      return
    }

    setEnrolling(true)
    try {
      await api.post(`/event/${id}/enrollment`)
      setIsEnrolled(true)
      toast.success('¡Te has inscrito exitosamente!')
    } catch (error) {
      const message = error.response?.data?.message || 'Error al inscribirse'
      toast.error(message)
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async () => {
    setUnenrolling(true)
    try {
      await api.delete(`/event/${id}/enrollment`)
      setIsEnrolled(false)
      toast.success('Te has desinscrito del evento')
    } catch (error) {
      const message = error.response?.data?.message || 'Error al desinscribirse'
      toast.error(message)
    } finally {
      setUnenrolling(false)
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

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="card">
            <div className="card-content">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600">Evento no encontrado</h2>
      </div>
    )
  }

  const isEventPast = new Date(event.start_date) < new Date()
  const canEnroll = event.enabled_for_enrollment && !isEventPast && user && user.id !== event.id_creator_user

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/events')}
        className="btn-secondary mb-6 flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Eventos</span>
      </button>

      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="card-title mb-2">{event.name}</h1>
              <div className="flex items-center text-gray-600 mb-4">
                <User className="w-4 h-4 mr-2" />
                <span>Organizado por {event.creator_user.first_name} {event.creator_user.last_name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatPrice(event.price)}
              </div>
              {!event.enabled_for_enrollment && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  Inscripciones cerradas
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="card-content">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Descripción</h3>
              <p className="text-gray-700 mb-6">{event.description}</p>

              {event.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Detalles del Evento</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <div className="font-medium">Fecha y Hora</div>
                    <div className="text-gray-600">{formatDate(event.start_date)}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <div className="font-medium">Duración</div>
                    <div className="text-gray-600">{formatDuration(event.duration_in_minutes)}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <div className="font-medium">Ubicación</div>
                    <div className="text-gray-600">{event.event_location.name}</div>
                    <div className="text-sm text-gray-500">{event.event_location.full_address}</div>
                    <div className="text-sm text-gray-500">
                      {event.event_location.location.name}, {event.event_location.location.province.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <div className="font-medium">Capacidad</div>
                    <div className="text-gray-600">Máximo {event.max_assistance} personas</div>
                    <div className="text-sm text-gray-500">
                      Ubicación: {event.event_location.max_capacity} personas
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enrollment Actions */}
          {user && (
            <div className="mt-8 pt-6 border-t">
              {user.id === event.id_creator_user ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Este es tu evento</p>
                  <button className="btn-secondary" disabled>
                    Eres el organizador
                  </button>
                </div>
              ) : isEventPast ? (
                <div className="text-center">
                  <p className="text-gray-600">Este evento ya ha finalizado</p>
                </div>
              ) : !event.enabled_for_enrollment ? (
                <div className="text-center">
                  <p className="text-gray-600">Las inscripciones están cerradas para este evento</p>
                </div>
              ) : isEnrolled ? (
                <div className="text-center">
                  <p className="text-green-600 mb-4">¡Estás inscrito en este evento!</p>
                  <button
                    onClick={handleUnenroll}
                    disabled={unenrolling}
                    className="btn-danger"
                  >
                    {unenrolling ? 'Desinscribiendo...' : 'Desinscribirse'}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn-primary text-lg px-8 py-3"
                  >
                    {enrolling ? 'Inscribiendo...' : 'Inscribirse al Evento'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
            <div className="mt-8 pt-6 border-t text-center">
              <p className="text-gray-600 mb-4">
                Debes iniciar sesión para inscribirte a este evento
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary"
              >
                Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail