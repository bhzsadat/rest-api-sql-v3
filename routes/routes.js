const express = require('express');
const router = express.Router();
const { Users, Courses } = require('../models');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');


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
        res.location('/').status(201).end();
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

router.post('/users', async (req, res) => {
    try {
        const { firstName, lastName, emailAddress, password } = req.body;
        const hashedPassword = await bcryptjs.hash(password, 10);
        const user = await Users.create({
            firstName,
            lastName,
            emailAddress,
            password: hashedPassword
        });
        res.status(201).json(user);
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

router.get('/courses', async (req, res) => {
    try {
        const courses = await Courses.findAll();
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/courses/:id', async (req, res) => {
    try {
        const course = await Courses.findByPk(req.params.id);
        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/courses', authenticateUser, async (req, res) => {
    try {
        const course = await Courses.create(req.body);
        res.status(201).json(course);
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

router.put('/courses/:id', authenticateUser, async (req, res) => {
    try {
        const course = await Courses.findByPk(req.params.id);
        if (course) {
            await course.update(req.body);
            res.status(204).end();
        } else {
            res.status(404).json({ message: 'Course Not Found' });
        }
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            res.status(400).json({ message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

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