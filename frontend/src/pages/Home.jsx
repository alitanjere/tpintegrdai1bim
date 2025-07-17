import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Star } from 'lucide-react'

const Home = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg mb-12">
        <h1 className="text-5xl font-bold mb-6">
          Descubre Eventos Increíbles
        </h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Encuentra, crea y participa en los mejores eventos de tu ciudad. 
          Conecta con personas que comparten tus intereses.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/events" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Ver Eventos
          </Link>
          <Link to="/register" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
            Únete Ahora
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="card text-center">
          <div className="card-content pt-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Eventos Diversos</h3>
            <p className="text-gray-600">
              Desde conciertos hasta conferencias, encuentra eventos que se adapten a tus gustos e intereses.
            </p>
          </div>
        </div>

        <div className="card text-center">
          <div className="card-content pt-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Ubicaciones Únicas</h3>
            <p className="text-gray-600">
              Descubre lugares increíbles en tu ciudad y crea recuerdos inolvidables en cada evento.
            </p>
          </div>
        </div>

        <div className="card text-center">
          <div className="card-content pt-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Comunidad Activa</h3>
            <p className="text-gray-600">
              Conecta con personas afines, haz nuevos amigos y amplía tu red social en cada evento.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-100 rounded-lg p-8 mb-16">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-gray-600">Eventos Creados</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">10K+</div>
            <div className="text-gray-600">Participantes</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
            <div className="text-gray-600">Ubicaciones</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 mb-2">4.8</div>
            <div className="text-gray-600 flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              Calificación
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-white rounded-lg p-12 shadow-lg">
        <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Únete a nuestra comunidad y comienza a descubrir eventos increíbles o crea los tuyos propios.
        </p>
        <Link to="/register" className="btn-primary text-lg px-8 py-3">
          Crear Cuenta Gratis
        </Link>
      </div>
    </div>
  )
}

export default Home