import express, { Request, Response } from 'express';
import { Note, INote } from '../models/Note';
import { validateNote } from '../middleware/validation';

const router = express.Router();

// SPECIFIC ROUTES FIRST - must come before /:id route
// GET /api/notes/categories/list - Get all unique categories
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await Note.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/notes/tags/list - Get all unique tags
router.get('/tags/list', async (req: Request, res: Response) => {
  try {
    const tags = await Note.distinct('tags');
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/notes/stats/overview - Get notes statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [total, revisionCount, priorityStats, categoryStats] = await Promise.all([
      Note.countDocuments(),
      Note.countDocuments({ isRevision: true }),
      Note.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Note.aggregate([
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
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GENERAL ROUTES
// GET /api/notes - Get all notes with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, isRevision, priority, search, limit, skip = 0 } = req.query;
    
    const filter: any = {};
    
    if (category) filter.category = category;
    if (isRevision !== undefined) filter.isRevision = isRevision === 'true';
    if (priority) filter.priority = priority;
    
    let query = Note.find(filter);
    
    // Text search if search query provided
    if (search) {
      query = Note.find({ 
        $and: [
          filter,
          { $text: { $search: search as string } }
        ]
      });
    }
    
    const notes = await query
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();
    
    const total = await Note.countDocuments(filter);
    
    res.json({
      notes,
      total,
      page: Math.floor(Number(skip) / Number(limit)) + 1,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// DYNAMIC ROUTES LAST - must come after specific routes
// GET /api/notes/:id - Get a specific note
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// POST /api/notes - Create a new note
router.post('/', validateNote, async (req: Request, res: Response) => {
  try {
    const noteData = req.body;
    const note = new Note(noteData);
    const savedNote = await note.save();
    
    res.status(201).json(savedNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update an existing note
router.put('/:id', validateNote, async (req: Request, res: Response) => {
  try {
    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deletedNote = await Note.findByIdAndDelete(req.params.id);
    
    if (!deletedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;