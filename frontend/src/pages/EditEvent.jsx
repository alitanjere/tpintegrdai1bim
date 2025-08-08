import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import api from '../services/api'
import { Calendar, MapPin, DollarSign, Users, Clock, FileText, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = yup.object({
  name: yup
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .required('El nombre es requerido'),
  description: yup
    .string()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .required('La descripción es requerida'),
  id_event_location: yup
    .number()
    .positive('Selecciona una ubicación válida')
    .required('La ubicación es requerida'),
  start_date: yup
    .date()
    .required('La fecha de inicio es requerida'),
  duration_in_minutes: yup
    .number()
    .positive('La duración debe ser mayor a 0')
    .required('La duración es requerida'),
  price: yup
    .number()
    .min(0, 'El precio no puede ser negativo')
    .required('El precio es requerido'),
  max_assistance: yup
    .number()
    .positive('La capacidad debe ser mayor a 0')
    .required('La capacidad máxima es requerida'),
  enabled_for_enrollment: yup.boolean()
})

const EditEvent = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [eventLocations, setEventLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    resolver: yupResolver(schema)
  })

  const selectedLocationId = watch('id_event_location')
  const selectedLocation = eventLocations.find(loc => loc.id === parseInt(selectedLocationId))

  useEffect(() => {
    const fetchEventAndLocations = async () => {
      setLoading(true)
      try {
        const eventPromise = api.get(`/event/${id}`)
        const locationsPromise = api.get('/event-location')
        const [eventResponse, locationsResponse] = await Promise.all([eventPromise, locationsPromise])

        const event = eventResponse.data
        reset({
          ...event,
          start_date: new Date(event.start_date).toISOString().slice(0, 16),
        })

        setEventLocations(locationsResponse.data.collection)
      } catch (error) {
        toast.error('Error al cargar los datos del evento')
        navigate('/my-events')
      } finally {
        setLoading(false)
        setLoadingLocations(false)
      }
    }
    fetchEventAndLocations()
  }, [id, reset, navigate])

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const formattedData = {
        ...data,
        start_date: new Date(data.start_date).toISOString(),
        price: parseFloat(data.price),
        duration_in_minutes: parseInt(data.duration_in_minutes),
        max_assistance: parseInt(data.max_assistance),
        id_event_location: parseInt(data.id_event_location)
      }

      const response = await api.put(`/event/${id}`, formattedData)
      toast.success('¡Evento actualizado exitosamente!')
      navigate(`/events/${response.data.id}`)
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar el evento'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/my-events')}
        className="btn-secondary mb-6 flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Mis Eventos</span>
      </button>

      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Editar Evento</h1>
        </div>

        <div className="card-content">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Evento *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('name')}
                    type="text"
                    className={`input pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Ej: Concierto de Rock en Vivo"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className={`input resize-none ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Describe tu evento, qué pueden esperar los asistentes..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Location and Date */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Ubicación y Fecha</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación del Evento *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    {...register('id_event_location')}
                    className={`input pl-10 ${errors.id_event_location ? 'border-red-500' : ''}`}
                    disabled={loadingLocations}
                  >
                    <option value="">
                      {loadingLocations ? 'Cargando ubicaciones...' : 'Selecciona una ubicación'}
                    </option>
                    {eventLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.full_address}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.id_event_location && (
                  <p className="text-red-500 text-sm mt-1">{errors.id_event_location.message}</p>
                )}
                {selectedLocation && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Capacidad máxima de la ubicación:</strong> {selectedLocation.max_capacity} personas
                    </p>
                    <p className="text-sm text-blue-600">
                      {selectedLocation.location_name}, {selectedLocation.province_name}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha y Hora de Inicio *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('start_date')}
                    type="datetime-local"
                    className={`input pl-10 ${errors.start_date ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.start_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración (minutos) *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('duration_in_minutes')}
                    type="number"
                    min="1"
                    className={`input pl-10 ${errors.duration_in_minutes ? 'border-red-500' : ''}`}
                    placeholder="120"
                  />
                </div>
                {errors.duration_in_minutes && (
                  <p className="text-red-500 text-sm mt-1">{errors.duration_in_minutes.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Ej: 120 minutos = 2 horas
                </p>
              </div>
            </div>

            {/* Pricing and Capacity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Precio y Capacidad</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (ARS) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('price')}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`input pl-10 ${errors.price ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Ingresa 0 para eventos gratuitos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad Máxima *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('max_assistance')}
                    type="number"
                    min="1"
                    max={selectedLocation?.max_capacity || undefined}
                    className={`input pl-10 ${errors.max_assistance ? 'border-red-500' : ''}`}
                    placeholder="100"
                  />
                </div>
                {errors.max_assistance && (
                  <p className="text-red-500 text-sm mt-1">{errors.max_assistance.message}</p>
                )}
                {selectedLocation && (
                  <p className="text-sm text-gray-500 mt-1">
                    No puede exceder la capacidad de la ubicación ({selectedLocation.max_capacity} personas)
                  </p>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Configuración</h3>

              <div className="flex items-center">
                <input
                  {...register('enabled_for_enrollment')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Habilitar inscripciones
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Si está deshabilitado, los usuarios no podrán inscribirse al evento
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/my-events')}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || loadingLocations}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Actualizando Evento...' : 'Actualizar Evento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditEvent;
