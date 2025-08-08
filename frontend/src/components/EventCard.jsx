import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Edit, Trash2 } from 'lucide-react'

const EventCard = ({ event, showActions = false, onDelete }) => {
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
    <div className="card hover:shadow-lg transition-shadow">
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
            {event.event_location?.name || 'Ubicación no disponible'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            Máx. {event.max_assistance} personas
          </div>
        </div>

        {event.tags && event.tags.length > 0 && (
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
          {showActions && (
            <>
              <Link
                to={`/edit-event/${event.id}`}
                className="btn-secondary px-3"
                title="Editar evento"
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={() => onDelete(event.id)}
                className="btn-danger px-3"
                title="Eliminar evento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard
