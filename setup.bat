@echo off
echo 🚀 Setting up Smart Curriculum Activity & Attendance App...

REM Create necessary directories
mkdir backend\logs 2>nul
mkdir backend\uploads 2>nul
mkdir data 2>nul

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

REM Generate Prisma client
echo 🔧 Setting up database...
call npx prisma generate

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install

cd ..

echo ✅ Setup complete!
echo.
echo 🚀 To start the application:
echo    docker-compose up --build
echo.
echo 🔐 Default credentials:
echo    Admin: admin@school.com / admin123
echo    Teacher: john.smith@school.com / teacher123
echo    Student: alice.wilson@school.com / student123
echo.
echo 📱 Access the app at:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:5000
echo    API Docs: http://localhost:5000/api-docs
pause
