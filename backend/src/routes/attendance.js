const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/attendance/generate-qr:
 *   post:
 *     summary: Generate QR code for attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classId
 *             properties:
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *       403:
 *         description: Access denied
 */
router.post('/generate-qr', [
  authenticateToken,
  authorizeRoles('TEACHER', 'ADMIN'),
  body('classId').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array(),
      });
    }

    const { classId } = req.body;

    // Check if class exists and teacher has access
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: true },
    });

    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        message: 'The specified class does not exist',
      });
    }

    // Only allow teachers to generate QR for their own classes
    if (req.user.role === 'TEACHER') {
      // Check if the current user has a teacher profile and if they own this class
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile || teacherProfile.id !== classData.teacherId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only generate QR codes for your own classes',
        });
      }
    }

    // Generate unique QR code
    const qrCodeData = `${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create QR code record
    const qrCodeRecord = await prisma.qRCode.create({
      data: {
        classId,
        code: qrCodeData,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    res.json({
      message: 'QR code generated successfully',
      qrCode: {
        id: qrCodeRecord.id,
        code: qrCodeData,
        expiresAt: qrCodeRecord.expiresAt,
        image: qrCodeImage,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      error: 'QR generation failed',
      message: 'Failed to generate QR code',
    });
  }
});

/**
 * @swagger
 * /api/attendance/scan:
 *   post:
 *     summary: Scan QR code to mark attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCode
 *             properties:
 *               qrCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       400:
 *         description: Invalid QR code
 *       403:
 *         description: Access denied
 */
router.post('/scan', [
  authenticateToken,
  authorizeRoles('STUDENT'),
  body('qrCode').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array(),
      });
    }

    const { qrCode } = req.body;

    // Find QR code
    const qrCodeRecord = await prisma.qRCode.findUnique({
      where: { code: qrCode },
      include: { class: true },
    });

    if (!qrCodeRecord) {
      return res.status(400).json({
        error: 'Invalid QR code',
        message: 'The QR code is not valid',
      });
    }

    // Check if QR code has expired
    if (new Date() > qrCodeRecord.expiresAt) {
      return res.status(400).json({
        error: 'QR code expired',
        message: 'The QR code has expired',
      });
    }

    // Check if student is enrolled in the class
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: req.user.studentProfile.id,
          classId: qrCodeRecord.classId,
        },
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not enrolled in this class',
      });
    }

    // Check if attendance already marked for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: req.user.studentProfile.id,
        classId: qrCodeRecord.classId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        error: 'Attendance already marked',
        message: 'You have already marked attendance for this class today',
      });
    }

    // Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        studentId: req.user.studentProfile.id,
        classId: qrCodeRecord.classId,
        date: new Date(),
        status: 'PRESENT',
        qrCode: qrCode,
      },
    });

    res.json({
      message: 'Attendance marked successfully',
      attendance: {
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        class: qrCodeRecord.class.name,
      },
    });
  } catch (error) {
    console.error('Attendance marking error:', error);
    res.status(500).json({
      error: 'Attendance marking failed',
      message: 'Failed to mark attendance',
    });
  }
});

/**
 * @swagger
 * /api/attendance/class/{classId}:
 *   get:
 *     summary: Get class attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Class attendance retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/class/:classId', [
  authenticateToken,
  authorizeRoles('TEACHER', 'ADMIN'),
], async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { 
        teacher: {
          include: {
            user: true
          }
        } 
      },
    });

    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        message: 'The specified class does not exist',
      });
    }

    // Only allow teachers to view their own class attendance
    if (req.user.role === 'TEACHER') {
      // Check if the current user has a teacher profile and if they own this class
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!teacherProfile || teacherProfile.id !== classData.teacherId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view attendance for your own classes',
        });
      }
    }

    // Get attendance for the specified date or today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const attendances = await prisma.attendance.findMany({
      where: {
        classId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    // Get all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    // Create attendance summary
    const attendanceSummary = enrollments.map(enrollment => {
      const attendance = attendances.find(a => a.studentId === enrollment.studentId);
      return {
        studentId: enrollment.student.id,
        studentName: enrollment.student.user.name,
        studentEmail: enrollment.student.user.email,
        status: attendance ? attendance.status : 'ABSENT',
        markedAt: attendance ? attendance.createdAt : null,
      };
    });

    res.json({
      message: 'Class attendance retrieved successfully',
      class: {
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        section: classData.section,
      },
      date: targetDate,
      attendance: attendanceSummary,
      summary: {
        total: attendanceSummary.length,
        present: attendanceSummary.filter(a => a.status === 'PRESENT').length,
        absent: attendanceSummary.filter(a => a.status === 'ABSENT').length,
        late: attendanceSummary.filter(a => a.status === 'LATE').length,
      },
    });
  } catch (error) {
    console.error('Attendance retrieval error:', error);
    res.status(500).json({
      error: 'Attendance retrieval failed',
      message: 'Failed to retrieve class attendance',
    });
  }
});

/**
 * @swagger
 * /api/attendance/student:
 *   get:
 *     summary: Get student's own attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student attendance retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/student', [
  authenticateToken,
  authorizeRoles('STUDENT'),
], async (req, res) => {
  try {
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: req.user.studentProfile.id,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate attendance percentage
    const totalClasses = attendances.length;
    const presentClasses = attendances.filter(a => a.status === 'PRESENT').length;
    const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

    res.json({
      message: 'Student attendance retrieved successfully',
      attendance: attendances,
      summary: {
        total: totalClasses,
        present: presentClasses,
        absent: totalClasses - presentClasses,
        percentage: Math.round(attendancePercentage * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Student attendance retrieval error:', error);
    res.status(500).json({
      error: 'Attendance retrieval failed',
      message: 'Failed to retrieve student attendance',
    });
  }
});

module.exports = router;
