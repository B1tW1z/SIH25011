import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { 
  Clock, 
  Calendar, 
  Upload,
  Download,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ScheduleData {
  classId: string
  className: string
  subject: string
  grade: string
  section: string
  teacherName: string
  schedule: any
}

const Schedule = () => {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState<ScheduleData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/schedule/weekly')
      setSchedule(response.data.schedule)
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-600">View your weekly class schedule</p>
      </div>

      {/* Weekly Schedule */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Weekly Schedule</h3>
          <button
            onClick={fetchSchedule}
            className="btn-outline flex items-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>

        {schedule.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  {daysOfWeek.map((day) => (
                    <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((cls) => (
                  <tr key={cls.classId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cls.className}</div>
                      <div className="text-sm text-gray-500">{cls.subject}</div>
                      <div className="text-xs text-gray-400">{cls.grade}{cls.section}</div>
                    </td>
                    {daysOfWeek.map((day) => (
                      <td key={day} className="px-6 py-4 whitespace-nowrap">
                        {cls.schedule[day] ? (
                          <div className="text-sm text-gray-900 bg-blue-50 p-2 rounded">
                            {cls.schedule[day]}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No schedule data available</p>
          </div>
        )}
      </div>

      {/* Class List View */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Class Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedule.map((cls) => (
            <div key={cls.classId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{cls.className}</h4>
                  <p className="text-sm text-gray-600">{cls.subject}</p>
                  <p className="text-xs text-gray-500">Grade {cls.grade} - Section {cls.section}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Teacher:</span> {cls.teacherName}
                </div>
                
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Schedule:</span>
                  <div className="mt-1 space-y-1">
                    {daysOfWeek.map((day) => (
                      cls.schedule[day] && (
                        <div key={day} className="text-xs bg-gray-50 p-1 rounded">
                          <span className="capitalize">{day}:</span> {cls.schedule[day]}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Schedule
