const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for CSV upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * @swagger
 * /api/schedule/upload:
 *   post:
 *     summary: Upload CSV schedule file
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Schedule uploaded successfully
 *       400:
 *         description: Invalid file format
 *       403:
 *         description: Access denied
 */
router.post('/upload', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  upload.single('file'),
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a CSV file',
      });
    }

    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        // Validate CSV structure
        if (!data.className || !data.subject || !data.grade || !data.section || !data.teacherName || !data.schedule) {
          errors.push(`Invalid row: Missing required fields - ${JSON.stringify(data)}`);
          return;
        }
        results.push(data);
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          if (errors.length > 0) {
            return res.status(400).json({
              error: 'CSV parsing errors',
              details: errors,
            });
          }

          // Process schedule data
          const processedSchedules = [];
          for (const row of results) {
            try {
              // Find or create teacher
              let teacher = await prisma.teacherProfile.findFirst({
                where: {
                  user: {
                    name: { contains: row.teacherName, mode: 'insensitive' },
                  },
                },
                include: { user: true },
              });

              if (!teacher) {
                // Create teacher if doesn't exist
                const teacherUser = await prisma.user.create({
                  data: {
                    name: row.teacherName,
                    email: `${row.teacherName.toLowerCase().replace(/\s+/g, '.')}@school.com`,
                    password: 'temp123', // Temporary password
                    role: 'TEACHER',
                  },
                });

                teacher = await prisma.teacherProfile.create({
                  data: {
                    subject: row.subject,
                    userId: teacherUser.id,
                  },
                  include: { user: true },
                });
              }

              // Find or create class
              let classData = await prisma.class.findFirst({
                where: {
                  name: row.className,
                  grade: row.grade,
                  section: row.section,
                },
              });

              if (!classData) {
                classData = await prisma.class.create({
                  data: {
                    name: row.className,
                    subject: row.subject,
                    grade: row.grade,
                    section: row.section,
                    teacherId: teacher.id,
                    schedule: row.schedule,
                  },
                });
              } else {
                // Update existing class
                await prisma.class.update({
                  where: { id: classData.id },
                  data: {
                    subject: row.subject,
                    teacherId: teacher.id,
                    schedule: row.schedule,
                  },
                });
              }

              processedSchedules.push({
                className: row.className,
                subject: row.subject,
                grade: row.grade,
                section: row.section,
                teacherName: teacher.user.name,
                schedule: row.schedule,
              });
            } catch (error) {
              errors.push(`Error processing row: ${JSON.stringify(row)} - ${error.message}`);
            }
          }

          res.json({
            message: 'Schedule uploaded successfully',
            processed: processedSchedules.length,
            errors: errors.length > 0 ? errors : undefined,
            schedules: processedSchedules,
          });
        } catch (error) {
          console.error('Schedule processing error:', error);
          res.status(500).json({
            error: 'Schedule processing failed',
            message: 'Failed to process uploaded schedule',
          });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        console.error('CSV parsing error:', error);
        res.status(500).json({
          error: 'CSV parsing failed',
          message: 'Failed to parse uploaded CSV file',
        });
      });
  } catch (error) {
    console.error('Schedule upload error:', error);
    res.status(500).json({
      error: 'Schedule upload failed',
      message: 'Failed to upload schedule file',
    });
  }
});

/**
 * @swagger
 * /api/schedule/class/{classId}:
 *   get:
 *     summary: Get class schedule
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class schedule retrieved successfully
 *       404:
 *         description: Class not found
 */
router.get('/class/:classId', [
  authenticateToken,
], async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
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

    // Parse schedule JSON
    let schedule = {};
    try {
      schedule = JSON.parse(classData.schedule);
    } catch (error) {
      schedule = { raw: classData.schedule };
    }

    res.json({
      message: 'Class schedule retrieved successfully',
      schedule: {
        classId: classData.id,
        className: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        section: classData.section,
        teacherName: classData.teacher.user.name,
        schedule,
      },
    });
  } catch (error) {
    console.error('Schedule retrieval error:', error);
    res.status(500).json({
      error: 'Schedule retrieval failed',
      message: 'Failed to retrieve class schedule',
    });
  }
});

/**
 * @swagger
 * /api/schedule/update:
 *   put:
 *     summary: Update class schedule
 *     tags: [Schedule]
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
 *               - schedule
 *             properties:
 *               classId:
 *                 type: string
 *               schedule:
 *                 type: object
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       403:
 *         description: Access denied
 */
router.put('/update', [
  authenticateToken,
  authorizeRoles('ADMIN', 'TEACHER'),
  body('classId').notEmpty(),
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

    const { classId, schedule } = req.body;

    // Check if class exists
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

    // Teachers can only update their own class schedules
    if (req.user.role === 'TEACHER' && classData.teacherId !== req.user.teacherProfile.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update schedules for your own classes',
      });
    }

    // Update schedule
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
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

    res.json({
      message: 'Schedule updated successfully',
      schedule: {
        classId: updatedClass.id,
        className: updatedClass.name,
        subject: updatedClass.subject,
        grade: updatedClass.grade,
        section: updatedClass.section,
        teacherName: updatedClass.teacher.user.name,
        schedule: JSON.parse(updatedClass.schedule),
      },
    });
  } catch (error) {
    console.error('Schedule update error:', error);
    res.status(500).json({
      error: 'Schedule update failed',
      message: 'Failed to update class schedule',
    });
  }
});

/**
 * @swagger
 * /api/schedule/weekly:
 *   get:
 *     summary: Get weekly schedule for user
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly schedule retrieved successfully
 */
router.get('/weekly', [
  authenticateToken,
], async (req, res) => {
  try {
    let classes = [];

    if (req.user.role === 'STUDENT') {
      // Get enrolled classes
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
      // Get teacher's classes
      classes = await prisma.class.findMany({
        where: { teacherId: req.user.teacherProfile.id },
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      });
    } else {
      // Admin sees all classes
      classes = await prisma.class.findMany({
        include: {
          teacher: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      });
    }

    // Process schedules
    const weeklySchedule = classes.map(classData => {
      let schedule = {};
      try {
        schedule = JSON.parse(classData.schedule);
      } catch (error) {
        schedule = { raw: classData.schedule };
      }

      return {
        classId: classData.id,
        className: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        section: classData.section,
        teacherName: classData.teacher.user.name,
        schedule,
      };
    });

    res.json({
      message: 'Weekly schedule retrieved successfully',
      schedule: weeklySchedule,
    });
  } catch (error) {
    console.error('Weekly schedule retrieval error:', error);
    res.status(500).json({
      error: 'Schedule retrieval failed',
      message: 'Failed to retrieve weekly schedule',
    });
  }
});

module.exports = router;
