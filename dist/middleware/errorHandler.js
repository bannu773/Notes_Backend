"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    console.error('Error occurred:', error);
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
            error: 'Validation failed',
            details: messages
        });
    }
    // Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID format'
        });
    }
    // Duplicate key error
    if (error.code === 11000) {
        return res.status(409).json({
            error: 'Resource already exists'
        });
    }
    // Default server error
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map