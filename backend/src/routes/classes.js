const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all classes (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let classes;
    
    if (req.user.role === 'STUDENT') {
      // Students see only enrolled classes
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.studentProfile.id },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      classes = enrollments.map(e => e.class);
    } else if (req.user.role === 'TEACHER') {
      // Teachers see only their classes
      classes = await prisma.class.findMany({
        where: { teacherId: req.user.teacherProfile.id },
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
          enrollments: {
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } else {
      // Admins see all classes
      classes = await prisma.class.findMany({
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
          enrollments: {
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    }

    res.json({
      message: 'Classes retrieved successfully',
      classes,
    });
  } catch (error) {
    console.error('Classes retrieval error:', error);
    res.status(500).json({
      error: 'Classes retrieval failed',
      message: 'Failed to retrieve classes',
    });
  }
});

// Create new class (Admin only)
router.post('/', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('name').notEmpty(),
  body('subject').notEmpty(),
  body('grade').notEmpty(),
  body('section').notEmpty(),
  body('teacherId').notEmpty(),
  body('schedule').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array(),
      });
    }

    const { name, subject, grade, section, teacherId, schedule } = req.body;

    // Check if teacher exists
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return res.status(404).json({
        error: 'Teacher not found',
        message: 'The specified teacher does not exist',
      });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        subject,
        grade,
        section,
        teacherId,
        schedule: JSON.stringify(schedule),
      },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Class created successfully',
      class: newClass,
    });
  } catch (error) {
    console.error('Class creation error:', error);
    res.status(500).json({
      error: 'Class creation failed',
      message: 'Failed to create class',
    });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        message: 'The specified class does not exist',
      });
    }

    // Check access permissions
    if (req.user.role === 'STUDENT') {
      const isEnrolled = classData.enrollments.some(
        e => e.studentId === req.user.studentProfile.id
      );
      if (!isEnrolled) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not enrolled in this class',
        });
      }
    } else if (req.user.role === 'TEACHER' && classData.teacherId !== req.user.teacherProfile.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own classes',
      });
    }

    res.json({
      message: 'Class retrieved successfully',
      class: classData,
    });
  } catch (error) {
    console.error('Class retrieval error:', error);
    res.status(500).json({
      error: 'Class retrieval failed',
      message: 'Failed to retrieve class',
    });
  }
});

// Update class (Admin only)
router.put('/:id', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('name').optional().notEmpty(),
  body('subject').optional().notEmpty(),
  body('grade').optional().notEmpty(),
  body('section').optional().notEmpty(),
  body('teacherId').optional().notEmpty(),
  body('schedule').optional().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (updateData.schedule) {
      updateData.schedule = JSON.stringify(updateData.schedule);
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    res.json({
      message: 'Class updated successfully',
      class: updatedClass,
    });
  } catch (error) {
    console.error('Class update error:', error);
    res.status(500).json({
      error: 'Class update failed',
      message: 'Failed to update class',
    });
  }
});

// Delete class (Admin only)
router.delete('/:id', [
  authenticateToken,
  authorizeRoles('ADMIN'),
], async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.class.delete({
      where: { id },
    });

    res.json({
      message: 'Class deleted successfully',
    });
  } catch (error) {
    console.error('Class deletion error:', error);
    res.status(500).json({
      error: 'Class deletion failed',
      message: 'Failed to delete class',
    });
  }
});

// Enroll student in class
router.post('/:id/enroll', [
  authenticateToken,
  authorizeRoles('ADMIN', 'TEACHER'),
  body('studentId').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        details: errors.array(),
      });
    }

    const { id: classId } = req.params;
    const { studentId } = req.body;

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classData) {
      return res.status(404).json({
        error: 'Class not found',
        message: 'The specified class does not exist',
      });
    }

    // Check if student exists
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'The specified student does not exist',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        error: 'Already enrolled',
        message: 'Student is already enrolled in this class',
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
          },
        },
        class: {
          select: { name: true, subject: true },
        },
      },
    });

    res.status(201).json({
      message: 'Student enrolled successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      error: 'Enrollment failed',
      message: 'Failed to enroll student',
    });
  }
});

// Remove student from class
router.delete('/:id/enroll/:studentId', [
  authenticateToken,
  authorizeRoles('ADMIN', 'TEACHER'),
], async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    await prisma.enrollment.delete({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    res.json({
      message: 'Student removed from class successfully',
    });
  } catch (error) {
    console.error('Enrollment removal error:', error);
    res.status(500).json({
      error: 'Enrollment removal failed',
      message: 'Failed to remove student from class',
    });
  }
});

module.exports = router;
