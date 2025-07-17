import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import api from '../services/api'
import { MapPin, Users, FileText, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = yup.object({
  name: yup
    .string()
    .min(1, 'El nombre es requerido')
    .required('El nombre es requerido'),
  full_address: yup
    .string()
    .min(1, 'La dirección es requerida')
    .required('La dirección es requerida'),
  id_location: yup
    .number()
    .positive('Selecciona una ubicación válida')
    .required('La ubicación es requerida'),
  max_capacity: yup
    .number()
    .positive('La capacidad debe ser mayor a 0')
    .required('La capacidad máxima es requerida'),
  latitude: yup
    .number()
    .optional()
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value),
  longitude: yup
    .number()
    .optional()
    .nullable()
    .transform((value, originalValue) => originalValue === '' ? null : value)
})

const CreateEventLocation = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: yupResolver(schema)
  })

  const selectedLocationId = watch('id_location')
  const selectedLocation = locations.find(loc => loc.id === parseInt(selectedLocationId))

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      // This would need to be implemented in your API
      // For now, we'll use the sample data structure
      const sampleLocations = [
        { id: 1, name: 'Nuñez', province: { name: 'Ciudad Autónoma de Buenos Aires' } },
        { id: 2, name: 'Villa Crespo', province: { name: 'Ciudad Autónoma de Buenos Aires' } },
        { id: 3, name: 'La Plata', province: { name: 'Provincia de Buenos Aires' } }
      ]
      setLocations(sampleLocations)
    } catch (error) {
      toast.error('Error al cargar las ubicaciones')
      console.error('Error fetching locations:', error)
    } finally {
      setLoadingLocations(false)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const formattedData = {
        ...data,
        max_capacity: parseInt(data.max_capacity),
        id_location: parseInt(data.id_location),
        latitude: data.latitude || null,
        longitude: data.longitude || null
      }

      await api.post('/event-location', formattedData)
      toast.success('¡Ubicación creada exitosamente!')
      navigate('/event-locations')
    } catch (error) {
      const message = error.response?.data?.message || 'Error al crear la ubicación'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/event-locations')}
        className="btn-secondary mb-6 flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a Mis Ubicaciones</span>
      </button>

      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Crear Nueva Ubicación</h1>
          <p className="text-gray-600">Agrega una nueva ubicación para tus eventos</p>
        </div>

        <div className="card-content">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Ubicación *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('name')}
                    type="text"
                    className={`input pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Ej: Salón de Eventos Central"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Completa *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('full_address')}
                    type="text"
                    className={`input pl-10 ${errors.full_address ? 'border-red-500' : ''}`}
                    placeholder="Ej: Av. Corrientes 1234, CABA"
                  />
                </div>
                {errors.full_address && (
                  <p className="text-red-500 text-sm mt-1">{errors.full_address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación (Ciudad/Localidad) *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    {...register('id_location')}
                    className={`input pl-10 ${errors.id_location ? 'border-red-500' : ''}`}
                    disabled={loadingLocations}
                  >
                    <option value="">
                      {loadingLocations ? 'Cargando ubicaciones...' : 'Selecciona una ubicación'}
                    </option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.province.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.id_location && (
                  <p className="text-red-500 text-sm mt-1">{errors.id_location.message}</p>
                )}
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Capacidad</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad Máxima *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register('max_capacity')}
                    type="number"
                    min="1"
                    className={`input pl-10 ${errors.max_capacity ? 'border-red-500' : ''}`}
                    placeholder="500"
                  />
                </div>
                {errors.max_capacity && (
                  <p className="text-red-500 text-sm mt-1">{errors.max_capacity.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Número máximo de personas que puede albergar la ubicación
                </p>
              </div>
            </div>

            {/* Optional Coordinates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Coordenadas (Opcional)</h3>
              <p className="text-sm text-gray-600">
                Agrega las coordenadas GPS para una mejor localización
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitud
                  </label>
                  <input
                    {...register('latitude')}
                    type="number"
                    step="any"
                    className={`input ${errors.latitude ? 'border-red-500' : ''}`}
                    placeholder="-34.6037"
                  />
                  {errors.latitude && (
                    <p className="text-red-500 text-sm mt-1">{errors.latitude.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitud
                  </label>
                  <input
                    {...register('longitude')}
                    type="number"
                    step="any"
                    className={`input ${errors.longitude ? 'border-red-500' : ''}`}
                    placeholder="-58.3816"
                  />
                  {errors.longitude && (
                    <p className="text-red-500 text-sm mt-1">{errors.longitude.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/event-locations')}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || loadingLocations}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Creando Ubicación...' : 'Crear Ubicación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateEventLocation