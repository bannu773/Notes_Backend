"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Note_1 = require("../models/Note");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// GET /api/notes - Get all notes with optional filtering
router.get('/', async (req, res) => {
    try {
        const { category, isRevision, priority, search, limit = 100, skip = 0 } = req.query;
        const filter = {};
        if (category)
            filter.category = category;
        if (isRevision !== undefined)
            filter.isRevision = isRevision === 'true';
        if (priority)
            filter.priority = priority;
        let query = Note_1.Note.find(filter);
        // Text search if search query provided
        if (search) {
            query = Note_1.Note.find({
                $and: [
                    filter,
                    { $text: { $search: search } }
                ]
            });
        }
        const notes = await query
            .sort({ updatedAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip))
            .lean();
        const total = await Note_1.Note.countDocuments(filter);
        res.json({
            notes,
            total,
            page: Math.floor(Number(skip) / Number(limit)) + 1,
            totalPages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
// GET /api/notes/:id - Get a specific note
router.get('/:id', async (req, res) => {
    try {
        const note = await Note_1.Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note);
    }
    catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});
// POST /api/notes - Create a new note
router.post('/', validation_1.validateNote, async (req, res) => {
    try {
        const noteData = req.body;
        const note = new Note_1.Note(noteData);
        const savedNote = await note.save();
        res.status(201).json(savedNote);
    }
    catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});
// PUT /api/notes/:id - Update an existing note
router.put('/:id', validation_1.validateNote, async (req, res) => {
    try {
        const updatedNote = await Note_1.Note.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true });
        if (!updatedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(updatedNote);
    }
    catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});
// DELETE /api/notes/:id - Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const deletedNote = await Note_1.Note.findByIdAndDelete(req.params.id);
        if (!deletedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully', id: req.params.id });
    }
    catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});
// GET /api/notes/categories/list - Get all unique categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await Note_1.Note.distinct('category');
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// GET /api/notes/tags/list - Get all unique tags
router.get('/tags/list', async (req, res) => {
    try {
        const tags = await Note_1.Note.distinct('tags');
        res.json(tags);
    }
    catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});
// GET /api/notes/stats/overview - Get notes statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const [total, revisionCount, priorityStats, categoryStats] = await Promise.all([
            Note_1.Note.countDocuments(),
            Note_1.Note.countDocuments({ isRevision: true }),
            Note_1.Note.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Note_1.Note.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        res.json({
            total,
            revisionCount,
            priorityStats,
            categoryStats
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map