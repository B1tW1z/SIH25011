const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean up existing data
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.class.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned up existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@school.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  await prisma.adminProfile.create({
    data: {
      userId: adminUser.id,
    },
  });

  console.log('👑 Created admin user');

  // Create teacher users
  const teacherPassword = await bcrypt.hash('teacher123', 12);
  const teachers = [
    { name: 'John Smith', email: 'john.smith@school.com', subject: 'Mathematics' },
    { name: 'Sarah Johnson', email: 'sarah.johnson@school.com', subject: 'Physics' },
    { name: 'Michael Brown', email: 'michael.brown@school.com', subject: 'Chemistry' },
    { name: 'Emily Davis', email: 'emily.davis@school.com', subject: 'English' },
  ];

  const createdTeachers = [];
  for (const teacherData of teachers) {
    const teacherUser = await prisma.user.create({
      data: {
        email: teacherData.email,
        password: teacherPassword,
        name: teacherData.name,
        role: 'TEACHER',
      },
    });

    const teacherProfile = await prisma.teacherProfile.create({
      data: {
        subject: teacherData.subject,
        userId: teacherUser.id,
      },
    });

    createdTeachers.push({ user: teacherUser, profile: teacherProfile });
  }

  console.log('👨‍🏫 Created teacher users');

  // Create student users
  const studentPassword = await bcrypt.hash('student123', 12);
  const students = [
    { name: 'Alice Wilson', email: 'alice.wilson@school.com', grade: '10', section: 'A' },
    { name: 'Bob Miller', email: 'bob.miller@school.com', grade: '10', section: 'A' },
    { name: 'Carol Garcia', email: 'carol.garcia@school.com', grade: '10', section: 'A' },
    { name: 'David Rodriguez', email: 'david.rodriguez@school.com', grade: '10', section: 'A' },
    { name: 'Eva Martinez', email: 'eva.martinez@school.com', grade: '10', section: 'B' },
    { name: 'Frank Lee', email: 'frank.lee@school.com', grade: '10', section: 'B' },
    { name: 'Grace Taylor', email: 'grace.taylor@school.com', grade: '11', section: 'A' },
    { name: 'Henry Anderson', email: 'henry.anderson@school.com', grade: '11', section: 'A' },
  ];

  const createdStudents = [];
  for (const studentData of students) {
    const studentUser = await prisma.user.create({
      data: {
        email: studentData.email,
        password: studentPassword,
        name: studentData.name,
        role: 'STUDENT',
      },
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        studentId: `STU${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        grade: studentData.grade,
        section: studentData.section,
        userId: studentUser.id,
      },
    });

    createdStudents.push({ user: studentUser, profile: studentProfile });
  }

  console.log('👨‍🎓 Created student users');

  // Create classes
  const classes = [
    {
      name: 'Mathematics 10A',
      subject: 'Mathematics',
      grade: '10',
      section: 'A',
      teacherIndex: 0,
      schedule: {
        monday: '9:00 AM - 10:00 AM',
        tuesday: '9:00 AM - 10:00 AM',
        wednesday: '9:00 AM - 10:00 AM',
        thursday: '9:00 AM - 10:00 AM',
        friday: '9:00 AM - 10:00 AM',
      },
    },
    {
      name: 'Physics 10A',
      subject: 'Physics',
      grade: '10',
      section: 'A',
      teacherIndex: 1,
      schedule: {
        monday: '10:00 AM - 11:00 AM',
        tuesday: '10:00 AM - 11:00 AM',
        wednesday: '10:00 AM - 11:00 AM',
        thursday: '10:00 AM - 11:00 AM',
        friday: '10:00 AM - 11:00 AM',
      },
    },
    {
      name: 'Chemistry 10A',
      subject: 'Chemistry',
      grade: '10',
      section: 'A',
      teacherIndex: 2,
      schedule: {
        monday: '11:00 AM - 12:00 PM',
        tuesday: '11:00 AM - 12:00 PM',
        wednesday: '11:00 AM - 12:00 PM',
        thursday: '11:00 AM - 12:00 PM',
        friday: '11:00 AM - 12:00 PM',
      },
    },
    {
      name: 'English 10A',
      subject: 'English',
      grade: '10',
      section: 'A',
      teacherIndex: 3,
      schedule: {
        monday: '2:00 PM - 3:00 PM',
        tuesday: '2:00 PM - 3:00 PM',
        wednesday: '2:00 PM - 3:00 PM',
        thursday: '2:00 PM - 3:00 PM',
        friday: '2:00 PM - 3:00 PM',
      },
    },
    {
      name: 'Mathematics 10B',
      subject: 'Mathematics',
      grade: '10',
      section: 'B',
      teacherIndex: 0,
      schedule: {
        monday: '1:00 PM - 2:00 PM',
        tuesday: '1:00 PM - 2:00 PM',
        wednesday: '1:00 PM - 2:00 PM',
        thursday: '1:00 PM - 2:00 PM',
        friday: '1:00 PM - 2:00 PM',
      },
    },
    {
      name: 'Physics 10B',
      subject: 'Physics',
      grade: '10',
      section: 'B',
      teacherIndex: 1,
      schedule: {
        monday: '3:00 PM - 4:00 PM',
        tuesday: '3:00 PM - 4:00 PM',
        wednesday: '3:00 PM - 4:00 PM',
        thursday: '3:00 PM - 4:00 PM',
        friday: '3:00 PM - 4:00 PM',
      },
    },
  ];

  const createdClasses = [];
  for (const classData of classes) {
    const newClass = await prisma.class.create({
      data: {
        name: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        section: classData.section,
        teacherId: createdTeachers[classData.teacherIndex].profile.id,
        schedule: JSON.stringify(classData.schedule),
      },
    });

    createdClasses.push(newClass);
  }

  console.log('📚 Created classes');

  // Enroll students in classes
  const enrollments = [
    // Grade 10A students
    { studentIndex: 0, classIndex: 0 }, // Alice in Math 10A
    { studentIndex: 0, classIndex: 1 }, // Alice in Physics 10A
    { studentIndex: 0, classIndex: 2 }, // Alice in Chemistry 10A
    { studentIndex: 0, classIndex: 3 }, // Alice in English 10A
    
    { studentIndex: 1, classIndex: 0 }, // Bob in Math 10A
    { studentIndex: 1, classIndex: 1 }, // Bob in Physics 10A
    { studentIndex: 1, classIndex: 2 }, // Bob in Chemistry 10A
    { studentIndex: 1, classIndex: 3 }, // Bob in English 10A
    
    { studentIndex: 2, classIndex: 0 }, // Carol in Math 10A
    { studentIndex: 2, classIndex: 1 }, // Carol in Physics 10A
    { studentIndex: 2, classIndex: 2 }, // Carol in Chemistry 10A
    { studentIndex: 2, classIndex: 3 }, // Carol in English 10A
    
    { studentIndex: 3, classIndex: 0 }, // David in Math 10A
    { studentIndex: 3, classIndex: 1 }, // David in Physics 10A
    { studentIndex: 3, classIndex: 2 }, // David in Chemistry 10A
    { studentIndex: 3, classIndex: 3 }, // David in English 10A

    // Grade 10B students
    { studentIndex: 4, classIndex: 4 }, // Eva in Math 10B
    { studentIndex: 4, classIndex: 5 }, // Eva in Physics 10B
    
    { studentIndex: 5, classIndex: 4 }, // Frank in Math 10B
    { studentIndex: 5, classIndex: 5 }, // Frank in Physics 10B
  ];

  for (const enrollment of enrollments) {
    await prisma.enrollment.create({
      data: {
        studentId: createdStudents[enrollment.studentIndex].profile.id,
        classId: createdClasses[enrollment.classIndex].id,
      },
    });
  }

  console.log('📝 Created enrollments');

  // Create some sample attendance records
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const attendanceRecords = [
    // Today's attendance
    { studentIndex: 0, classIndex: 0, date: today, status: 'PRESENT' },
    { studentIndex: 1, classIndex: 0, date: today, status: 'PRESENT' },
    { studentIndex: 2, classIndex: 0, date: today, status: 'ABSENT' },
    { studentIndex: 3, classIndex: 0, date: today, status: 'PRESENT' },
    
    { studentIndex: 0, classIndex: 1, date: today, status: 'PRESENT' },
    { studentIndex: 1, classIndex: 1, date: today, status: 'LATE' },
    { studentIndex: 2, classIndex: 1, date: today, status: 'PRESENT' },
    { studentIndex: 3, classIndex: 1, date: today, status: 'PRESENT' },

    // Yesterday's attendance
    { studentIndex: 0, classIndex: 0, date: yesterday, status: 'PRESENT' },
    { studentIndex: 1, classIndex: 0, date: yesterday, status: 'PRESENT' },
    { studentIndex: 2, classIndex: 0, date: yesterday, status: 'PRESENT' },
    { studentIndex: 3, classIndex: 0, date: yesterday, status: 'ABSENT' },
  ];

  for (const record of attendanceRecords) {
    await prisma.attendance.create({
      data: {
        studentId: createdStudents[record.studentIndex].profile.id,
        classId: createdClasses[record.classIndex].id,
        date: record.date,
        status: record.status,
      },
    });
  }

  console.log('✅ Created sample attendance records');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Default credentials:');
  console.log('👑 Admin: admin@school.com / admin123');
  console.log('👨‍🏫 Teacher: john.smith@school.com / teacher123');
  console.log('👨‍🎓 Student: alice.wilson@school.com / student123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
