#!/bin/bash

echo "🚀 Setting up Smart Curriculum Activity & Attendance App..."

# Create necessary directories
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p data

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Generate Prisma client
echo "🔧 Setting up database..."
npx prisma generate

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   docker-compose up --build"
echo ""
echo "🔐 Default credentials:"
echo "   Admin: admin@school.com / admin123"
echo "   Teacher: john.smith@school.com / teacher123"
echo "   Student: alice.wilson@school.com / student123"
echo ""
echo "📱 Access the app at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   API Docs: http://localhost:5000/api-docs"
