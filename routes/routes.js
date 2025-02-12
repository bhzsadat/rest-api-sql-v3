const express = require('express');
const router = express.Router();
const { Users, Courses } = require('../models');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

// Middleware to authenticate the request
const authenticateUser = async (req, res, next) => {
    const credentials = auth(req);
    if (!credentials) {
        console.warn('Auth header not found');
        return res.status(401).json({ message: 'Access Denied' });
    }
    const user = await Users.findOne({ where: { emailAddress: credentials.name } });
    if (!user || !(await bcryptjs.compare(credentials.pass, user.password))) {
        const message = user 
            ? `Authentication failure for email: ${credentials.name}` 
            : `User not found for email: ${credentials.name}`;
        console.warn(message);
        return res.status(401).json({ message: 'Access Denied' });
    }
    console.log(`Authentication successful for email: ${user.emailAddress}`);
    req.currentUser = user;
    next();
};


router.get('/users', authenticateUser, async (req, res) => {
    try {
        const user = req.currentUser;
        res.status(200).json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.emailAddress
        });
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

// Route to create a new user
router.post('/users', async (req, res) => {
    try {
        const { firstName, lastName, emailAddress, password } = req.body;
        const hashedPassword = password ? await bcryptjs.hash(password, 10) : null;
        const user = await Users.create({
            firstName,
            lastName,
            emailAddress,
            password: hashedPassword
        });
        res.status(201).location(`/users/${user.id}`).end();
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            res.status(400).json({ message: errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ message: 'The email address is already in use.' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});


// Route to return a list of courses
router.get('/courses', async (req, res) => {
    try {
        const courses = await Courses.findAll({
            include: [{
                model: Users,
                as: 'User',
                attributes: ['id', 'firstName', 'lastName', 'emailAddress']
            }]
        });
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to return a course
router.get('/courses/:id', async (req, res) => {
    try {
        const course = await Courses.findByPk(req.params.id, {
            include: [{
                model: Users,
                as: 'User',
                attributes: ['id', 'firstName', 'lastName', 'emailAddress']
            }]
        });
        if (course) {
            res.status(200).json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to create a new course
router.post('/courses', authenticateUser, async (req, res) => {
    try {
        const { title, description } = req.body;
        const course = await Courses.create({
            title,
            description,
            userId: req.currentUser.id
        });
        res.status(201).location(`/courses/${course.id}`).end();
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            res.status(400).json({ message: errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

// Route to update a course
router.put('/courses/:id', authenticateUser, async (req, res) => {
    try {
        const { title, description } = req.body;
        const course = await Courses.findByPk(req.params.id);
        if (course) {
            await course.update({
                title,
                description
            });
            res.status(204).end();
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => e.message);
            res.status(400).json({ message: errors });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

// Route to delete a course
router.delete('/courses/:id', authenticateUser, async (req, res) => {
    try {
        const course = await Courses.findByPk(req.params.id);
        if (course) {
            await course.destroy();
            res.status(204).end();
        } else {
            res.status(404).json({ message: 'Course Not Found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;