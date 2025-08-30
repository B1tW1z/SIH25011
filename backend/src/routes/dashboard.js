const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/dashboard/student:
 *   get:
 *     summary: Get student dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student dashboard data retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/student', [
  authenticateToken,
  authorizeRoles('STUDENT'),
], async (req, res) => {
  try {
    // Get student's classes
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user.studentProfile.id },
      include: {
        class: {
          include: {
            teacher: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Get attendance summary for each class
    const classAttendance = await Promise.all(
      enrollments.map(async (enrollment) => {
        const attendances = await prisma.attendance.findMany({
          where: {
            studentId: req.user.studentProfile.id,
            classId: enrollment.class.id,
          },
        });

        const totalClasses = attendances.length;
        const presentClasses = attendances.filter(a => a.status === 'PRESENT').length;
        const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

        return {
          classId: enrollment.class.id,
          className: enrollment.class.name,
          subject: enrollment.class.subject,
          teacherName: enrollment.class.teacher.user.name,
          totalClasses,
          presentClasses,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        };
      })
    );

    // Get recent attendance
    const recentAttendance = await prisma.attendance.findMany({
      where: { studentId: req.user.studentProfile.id },
      include: {
        class: {
          select: { name: true, subject: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Calculate overall attendance
    const overallAttendance = classAttendance.reduce((acc, curr) => {
      acc.total += curr.totalClasses;
      acc.present += curr.presentClasses;
      return acc;
    }, { total: 0, present: 0 });

    const overallPercentage = overallAttendance.total > 0 
      ? (overallAttendance.present / overallAttendance.total) * 100 
      : 0;

    // Mock AI recommendations
    const recommendations = [
      'Your attendance in Mathematics is excellent! Keep it up.',
      'Consider attending more Physics classes to improve your understanding.',
      'You have a free period tomorrow at 2 PM. Great time to review Chemistry notes.',
    ];

    res.json({
      message: 'Student dashboard data retrieved successfully',
      data: {
        overallAttendance: {
          total: overallAttendance.total,
          present: overallAttendance.present,
          percentage: Math.round(overallPercentage * 100) / 100,
        },
        classAttendance,
        recentAttendance,
        recommendations,
        profile: {
          name: req.user.name,
          grade: req.user.studentProfile.grade,
          section: req.user.studentProfile.section,
          studentId: req.user.studentProfile.studentId,
        },
      },
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({
      error: 'Dashboard retrieval failed',
      message: 'Failed to retrieve student dashboard data',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/teacher:
 *   get:
 *     summary: Get teacher dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher dashboard data retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/teacher', [
  authenticateToken,
  authorizeRoles('TEACHER'),
], async (req, res) => {
  try {
    // Get teacher's classes
    const classes = await prisma.class.findMany({
      where: { teacherId: req.user.teacherProfile.id },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Get attendance summary for each class
    const classAttendanceSummary = await Promise.all(
      classes.map(async (classData) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayAttendance = await prisma.attendance.findMany({
          where: {
            classId: classData.id,
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        const totalStudents = classData.enrollments.length;
        const presentStudents = todayAttendance.filter(a => a.status === 'PRESENT').length;
        const attendancePercentage = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

        return {
          classId: classData.id,
          className: classData.name,
          subject: classData.subject,
          grade: classData.grade,
          section: classData.section,
          totalStudents,
          presentStudents,
          absentStudents: totalStudents - presentStudents,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        };
      })
    );

    // Get recent attendance trends
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const weeklyAttendance = await prisma.attendance.findMany({
      where: {
        class: {
          teacherId: req.user.teacherProfile.id,
        },
        date: {
          gte: lastWeek,
        },
      },
      include: {
        class: {
          select: { name: true },
        },
      },
    });

    // Group by date and class
    const attendanceByDate = weeklyAttendance.reduce((acc, attendance) => {
      const date = attendance.date.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = {};
      if (!acc[date][attendance.class.name]) acc[date][attendance.class.name] = 0;
      acc[date][attendance.class.name]++;
      return acc;
    }, {});

    res.json({
      message: 'Teacher dashboard data retrieved successfully',
      data: {
        totalClasses: classes.length,
        totalStudents: classes.reduce((acc, curr) => acc + curr.enrollments.length, 0),
        classAttendanceSummary,
        weeklyAttendance: attendanceByDate,
        profile: {
          name: req.user.name,
          subject: req.user.teacherProfile.subject,
        },
      },
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({
      error: 'Dashboard retrieval failed',
      message: 'Failed to retrieve teacher dashboard data',
    });
  }
});

/**
 * @swagger
 * /api/dashboard/admin:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/admin', [
  authenticateToken,
  authorizeRoles('ADMIN'),
], async (req, res) => {
  try {
    // Get overall statistics
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.studentProfile.count();
    const totalTeachers = await prisma.teacherProfile.count();
    const totalClasses = await prisma.class.count();

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalTodayAttendance = todayAttendance.length;
    const presentToday = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const todayPercentage = totalTodayAttendance > 0 ? (presentToday / totalTodayAttendance) * 100 : 0;

    // Get attendance by class
    const classAttendance = await prisma.class.findMany({
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
        attendances: {
          where: {
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    const classAttendanceSummary = classAttendance.map(classData => {
      const totalStudents = classData.enrollments.length;
      const presentStudents = classData.attendances.filter(a => a.status === 'PRESENT').length;
      const attendancePercentage = totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0;

      return {
        className: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        section: classData.section,
        totalStudents,
        presentStudents,
        absentStudents: totalStudents - presentStudents,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      };
    });

    // Get recent user registrations
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Mock AI insights
    const insights = [
      'Overall attendance has improved by 15% this week compared to last week.',
      'Mathematics classes show the highest attendance rate at 92%.',
      'Physics classes need attention with only 78% attendance rate.',
      'New student registrations are up by 20% this month.',
    ];

    res.json({
      message: 'Admin dashboard data retrieved successfully',
      data: {
        overview: {
          totalUsers,
          totalStudents,
          totalTeachers,
          totalClasses,
        },
        todayAttendance: {
          total: totalTodayAttendance,
          present: presentToday,
          absent: totalTodayAttendance - presentToday,
          percentage: Math.round(todayPercentage * 100) / 100,
        },
        classAttendanceSummary,
        recentUsers,
        insights,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Dashboard retrieval failed',
      message: 'Failed to retrieve admin dashboard data',
    });
  }
});

module.exports = router;
