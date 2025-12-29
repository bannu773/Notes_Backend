import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Note, INote } from '../models/Note';
import { NoteOrder } from '../models/NoteOrder';
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

// GET /api/notes/order/revision - Get revision notes in order
router.get('/order/revision', async (req: Request, res: Response) => {
  try {
    // Get all revision notes
    console.log('Fetching revision notes...');
    const revisionNotes = await Note.find({ isRevision: true }).lean();
    
    // Get all note orders
    const orders = await NoteOrder.find().sort({ order: 1 }).lean();
    
    // Create a map of noteId to order
    const orderMap = new Map<string, number>();
    orders.forEach((order) => {
      orderMap.set(order.noteId.toString(), order.order);
    });
    
    // Sort revision notes by their order, notes without order go to the end
    const sortedNotes = revisionNotes.sort((a, b) => {
      const orderA = orderMap.get(a._id.toString());
      const orderB = orderMap.get(b._id.toString());
      
      // If both have orders, sort by order
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      // If only a has order, a comes first
      if (orderA !== undefined) return -1;
      // If only b has order, b comes first
      if (orderB !== undefined) return 1;
      // If neither has order, sort by createdAt
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    // Transform notes to include proper id mapping
    const transformedNotes = sortedNotes.map((note: any) => ({
      ...note,
      id: note._id.toString(),
    }));
    
    res.json({
      notes: transformedNotes,
      total: transformedNotes.length
    });
  } catch (error) {
    console.error('Error fetching ordered revision notes:', error);
    res.status(500).json({ error: 'Failed to fetch ordered revision notes' });
  }
});

// POST /api/notes/order/bulk-update - Update order for multiple notes
router.post('/order/bulk-update', async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Orders must be an array' });
    }
    
    // Validate and prepare bulk operations
    const bulkOps = orders.map((item: { noteId: string; order: number }) => ({
      updateOne: {
        filter: { noteId: new mongoose.Types.ObjectId(item.noteId) },
        update: { $set: { order: item.order, updatedAt: new Date() } },
        upsert: true
      }
    }));
    
    if (bulkOps.length > 0) {
      await NoteOrder.bulkWrite(bulkOps);
    }
    
    res.json({ message: 'Orders updated successfully', count: orders.length });
  } catch (error) {
    console.error('Error updating note orders:', error);
    res.status(500).json({ error: 'Failed to update note orders' });
  }
});

// POST /api/notes/order/initialize - Initialize orders for all revision notes
router.post('/order/initialize', async (req: Request, res: Response) => {
  try {
    // Get all revision notes that don't have an order yet
    const revisionNotes = await Note.find({ isRevision: true }).sort({ createdAt: 1 }).lean();
    const existingOrders = await NoteOrder.find().lean();
    
    const existingNoteIds = new Set(existingOrders.map(o => o.noteId.toString()));
    
    // Find the max existing order
    let maxOrder = existingOrders.reduce((max, o) => Math.max(max, o.order), -1);
    
    // Create orders for notes that don't have one
    const newOrders = [];
    for (const note of revisionNotes) {
      if (!existingNoteIds.has(note._id.toString())) {
        maxOrder++;
        newOrders.push({
          noteId: note._id,
          order: maxOrder
        });
      }
    }
    
    if (newOrders.length > 0) {
      await NoteOrder.insertMany(newOrders);
    }
    
    res.json({ 
      message: 'Orders initialized successfully', 
      newOrdersCreated: newOrders.length,
      totalRevisionNotes: revisionNotes.length
    });
  } catch (error) {
    console.error('Error initializing note orders:', error);
    res.status(500).json({ error: 'Failed to initialize note orders' });
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
    
    // Get all note orders to include ordering information
    const orders = await NoteOrder.find().lean();
    const orderMap = new Map<string, number>();
    orders.forEach((order) => {
      orderMap.set(order.noteId.toString(), order.order);
    });
    
    // Transform notes to include proper id mapping and order
    const transformedNotes = notes.map((note: any) => ({
      ...note,
      id: note._id.toString(),
      customOrder: orderMap.get(note._id.toString())
    }));
    
    const total = await Note.countDocuments(filter);
    
    res.json({
      notes: transformedNotes,
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