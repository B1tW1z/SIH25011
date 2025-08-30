import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { BookOpen, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
  subject: string
  grade: string
  section: string
  teacher: {
    id: string
    user: {
      name: string
      email: string
    }
  }
  enrollments?: Array<{
    id: string
    student: {
      id: string
      user: {
        name: string
        email: string
      }
    }
  }>
}

const Classes = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/classes')
      setClasses(response.data.classes || [])
    } catch (error: any) {
      console.error('Failed to fetch classes:', error)
      const errorMessage = error.response?.data?.message || 'Failed to fetch classes. Please try again.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error Loading Classes</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchClasses}
            className="btn-primary flex items-center mx-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-600">Manage your classes and view enrollments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
                <p className="text-sm text-gray-600">{cls.subject}</p>
                <p className="text-xs text-gray-500">Grade {cls.grade} - Section {cls.section}</p>
              </div>
              <div className="p-2 bg-primary-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>Teacher: {cls.teacher?.user?.name || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>Students: {cls.enrollments?.length || 0}</span>
              </div>

              {cls.enrollments && cls.enrollments.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Enrolled Students:</p>
                  <div className="space-y-1">
                    {cls.enrollments.slice(0, 3).map((enrollment, index) => (
                      <div key={enrollment.id || index} className="text-xs text-gray-600">
                        • {enrollment.student?.user?.name || 'Unknown Student'}
                      </div>
                    ))}
                    {cls.enrollments.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{cls.enrollments.length - 3} more students
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No classes found</p>
        </div>
      )}
    </div>
  )
}

export default Classes
