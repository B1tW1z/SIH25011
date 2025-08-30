const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (Admin only)
router.get('/', [
  authenticateToken,
  authorizeRoles('ADMIN'),
], async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        studentProfile: {
          select: {
            studentId: true,
            grade: true,
            section: true,
          },
        },
        teacherProfile: {
          select: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      message: 'Users retrieved successfully',
      users,
    });
  } catch (error) {
    console.error('Users retrieval error:', error);
    res.status(500).json({
      error: 'Users retrieval failed',
      message: 'Failed to retrieve users',
    });
  }
});

// Get user by ID
router.get('/:id', [
  authenticateToken,
], async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own profile',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist',
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
      message: 'User retrieved successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('User retrieval error:', error);
    res.status(500).json({
      error: 'User retrieval failed',
      message: 'Failed to retrieve user',
    });
  }
});

// Update user profile
router.put('/:id', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
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

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile',
      });
    }

    const updateData = { ...req.body };
    delete updateData.password; // Password updates handled separately
    delete updateData.role; // Role updates handled separately

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'User updated successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      error: 'User update failed',
      message: 'Failed to update user',
    });
  }
});

// Update user role (Admin only)
router.patch('/:id/role', [
  authenticateToken,
  authorizeRoles('ADMIN'),
  body('role').isIn(['STUDENT', 'TEACHER', 'ADMIN']),
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
    const { role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist',
      });
    }

    // Delete existing profiles
    if (existingUser.studentProfile) {
      await prisma.studentProfile.delete({
        where: { userId: id },
      });
    }
    if (existingUser.teacherProfile) {
      await prisma.teacherProfile.delete({
        where: { userId: id },
      });
    }
    if (existingUser.adminProfile) {
      await prisma.adminProfile.delete({
        where: { userId: id },
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    // Create new profile based on role
    if (role === 'STUDENT') {
      await prisma.studentProfile.create({
        data: {
          studentId: `STU${Date.now()}`,
          grade: '10',
          section: 'A',
          userId: id,
        },
      });
    } else if (role === 'TEACHER') {
      await prisma.teacherProfile.create({
        data: {
          subject: 'General',
          userId: id,
        },
      });
    } else if (role === 'ADMIN') {
      await prisma.adminProfile.create({
        data: {
          userId: id,
        },
      });
    }

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({
      error: 'User role update failed',
      message: 'Failed to update user role',
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', [
  authenticateToken,
  authorizeRoles('ADMIN'),
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist',
      });
    }

    // Delete user (cascades to profiles)
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({
      error: 'User deletion failed',
      message: 'Failed to delete user',
    });
  }
});

// Get teachers (for class assignment)
router.get('/teachers/list', [
  authenticateToken,
  authorizeRoles('ADMIN'),
], async (req, res) => {
  try {
    const teachers = await prisma.teacherProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      message: 'Teachers retrieved successfully',
      teachers,
    });
  } catch (error) {
    console.error('Teachers retrieval error:', error);
    res.status(500).json({
      error: 'Teachers retrieval failed',
      message: 'Failed to retrieve teachers',
    });
  }
});

// Get students (for class enrollment)
router.get('/students/list', [
  authenticateToken,
  authorizeRoles('ADMIN', 'TEACHER'),
], async (req, res) => {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    res.json({
      message: 'Students retrieved successfully',
      students,
    });
  } catch (error) {
    console.error('Students retrieval error:', error);
    res.status(500).json({
      error: 'Students retrieval failed',
      message: 'Failed to retrieve students',
    });
  }
});

module.exports = router;
