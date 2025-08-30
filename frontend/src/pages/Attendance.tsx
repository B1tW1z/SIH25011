import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { QRCodeSVG } from 'qrcode.react'
import { 
  QrCode, 
  Camera, 
  Download, 
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
  subject: string
  grade: string
  section: string
}

interface QRCode {
  id: string
  code: string
  expiresAt: string
  image: string
}

interface AttendanceRecord {
  studentId: string
  studentName: string
  studentEmail: string
  status: string
  markedAt: string | null
}

const Attendance = () => {
  const { user } = useAuth()
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [qrCode, setQrCode] = useState<QRCode | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes')
      setClasses(response.data.classes || [])
      if (response.data.classes && response.data.classes.length > 0) {
        setSelectedClass(response.data.classes[0].id)
      }
    } catch (error: any) {
      console.error('Failed to fetch classes:', error)
      toast.error('Failed to fetch classes')
    }
  }

  const generateQRCode = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/attendance/generate-qr', { classId: selectedClass })
      setQrCode(response.data.qrCode)
      toast.success('QR code generated successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async () => {
    if (!selectedClass) return

    try {
      const response = await api.get(`/attendance/class/${selectedClass}`)
      setAttendanceData(response.data.attendance)
    } catch (error: any) {
      console.error('Failed to fetch attendance:', error)
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view attendance for this class')
      } else {
        toast.error('Failed to fetch attendance data')
      }
    }
  }

  useEffect(() => {
    if (selectedClass) {
      fetchAttendance()
    }
  }, [selectedClass])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'ABSENT':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'LATE':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'ABSENT':
        return 'bg-red-100 text-red-800'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadQRCode = () => {
    if (!qrCode) return
    
    const canvas = document.createElement('canvas')
    const svg = document.querySelector('svg')
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0)
        const link = document.createElement('a')
        link.download = `qr-code-${selectedClass}.png`
        link.href = canvas.toDataURL()
        link.click()
      }
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
    }
  }

  if (user?.role === 'STUDENT') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">Scan QR codes to mark your attendance</p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code Scanner</h3>
          <div className="text-center">
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="btn-primary flex items-center mx-auto"
            >
              <Camera className="h-5 w-5 mr-2" />
              {showScanner ? 'Hide Scanner' : 'Show Scanner'}
            </button>
            
            {showScanner && (
              <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-600 mb-4">
                  Point your camera at a QR code to scan and mark attendance
                </p>
                <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Camera scanner placeholder</p>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Note: This is a mock scanner. In a real app, this would use device camera.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-600">Generate QR codes and manage class attendance</p>
      </div>

      {/* Class Selection */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Class</h3>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="input max-w-xs"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} - {cls.subject} ({cls.grade}{cls.section})
            </option>
          ))}
        </select>
      </div>

      {/* QR Code Generation */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code Generation</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={generateQRCode}
            disabled={loading || !selectedClass}
            className="btn-primary flex items-center"
          >
            {loading ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-5 w-5 mr-2" />
            )}
            Generate QR Code
          </button>
          
          {qrCode && (
            <button
              onClick={downloadQRCode}
              className="btn-outline flex items-center"
            >
              <Download className="h-5 w-5 mr-2" />
              Download
            </button>
          )}
        </div>

        {qrCode && (
          <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrCode.code} size={200} />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Code: {qrCode.code}
              </p>
              <p className="text-sm text-gray-600">
                Expires: {new Date(qrCode.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Records */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Class Attendance</h3>
          <button
            onClick={fetchAttendance}
            className="btn-outline flex items-center"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh
          </button>
        </div>

        {attendanceData.length > 0 ? (
          <div className="space-y-3">
            {attendanceData.map((record) => (
              <div key={record.studentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <p className="font-medium text-gray-900">{record.studentName}</p>
                    <p className="text-sm text-gray-600">{record.studentEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                  {record.markedAt && (
                    <span className="text-sm text-gray-500">
                      {new Date(record.markedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No attendance records found for this class</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Attendance
