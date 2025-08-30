# Smart Curriculum Activity & Attendance App

A hackathon-ready full-stack web application for managing curriculum activities and attendance tracking with role-based access control.

## 🚀 Features

### Core MVP Features
- **Role-based Authentication**: JWT + bcrypt for secure logins (Student, Teacher, Admin)
- **Attendance Module**: QR code generation and scanning for attendance marking
- **Schedule Management**: CSV upload and form-based timetable management
- **Dashboard Analytics**: Role-specific dashboards with charts and insights
- **Responsive Design**: Mobile-friendly PWA-ready interface

### Tech Stack
- **Frontend**: React.js + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + JWT + bcrypt
- **Database**: SQLite + Prisma ORM
- **Deployment**: Docker + Docker Compose

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### One-Command Setup
```bash
# Clone and setup everything
git clone <your-repo>
cd sih-v1

# Run setup script (Linux/Mac)
chmod +x setup.sh
./setup.sh

# Or on Windows
setup.bat

# Start the application
docker-compose up --build
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: SQLite (persisted in Docker volume)

### Manual Setup (Development)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## 📁 Project Structure
```
├── frontend/          # React + TypeScript + Vite
├── backend/           # Node.js + Express + Prisma
├── docker-compose.yml # One-command deployment
├── .env.example       # Environment variables template
└── README.md          # This file
```

## 🔐 Default Credentials

### Admin
- Email: admin@school.com
- Password: admin123

### Teacher
- Email: teacher@school.com
- Password: teacher123

### Student
- Email: student@school.com
- Password: student123

## 🚀 Deployment

### Docker (Recommended)
```bash
docker-compose up --build -d
```

### Manual Deployment
1. Set environment variables in `.env`
2. Run database migrations: `npx prisma migrate deploy`
3. Start backend: `npm start`
4. Build and serve frontend: `npm run build && npm run preview`

## 🔮 Future Roadmap

- [ ] AI-powered attendance prediction
- [ ] ERP system integration
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Multi-tenant support

## 📝 API Documentation

API documentation is available at `/api-docs` when the backend is running.

## 🤝 Contributing

This is a hackathon project. Feel free to fork and enhance!

## 📄 License

MIT License - feel free to use for your hackathon!
