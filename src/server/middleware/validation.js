const { body, validationResult } = require('express-validator');

exports.validateDriverRegistration = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('vehicle_type').trim().notEmpty().withMessage('Vehicle type is required'),
    body('vehicle_number').trim().notEmpty().withMessage('Vehicle number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array().map(err => err.msg) 
            });
        }
        next();
    }
];