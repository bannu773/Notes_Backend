import express, { Request, Response } from 'express';
import { NoteOrder } from '../models/NoteOrder';
import { Note } from '../models/Note';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/note-order - Get all note orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await NoteOrder.find().sort({ order: 1 }).lean();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching note orders:', error);
    res.status(500).json({ error: 'Failed to fetch note orders' });
  }
});

// GET /api/note-order/revision-notes - Get revision notes in order
router.get('/revision-notes', async (req: Request, res: Response) => {
  try {
    // Get all revision notes
    const revisionNotes = await Note.find({ isRevision: true }).lean();
    
    // Get all note orders
    const orders = await NoteOrder.find().sort({ order: 1 }).lean();
    
    // Create a map of noteId to order
    const orderMap = new Map<string, number>();
    orders.forEach((order, index) => {
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

// POST /api/note-order/bulk-update - Update order for multiple notes
router.post('/bulk-update', async (req: Request, res: Response) => {
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

// PUT /api/note-order/:noteId - Update order for a single note
router.put('/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { order } = req.body;
    
    if (typeof order !== 'number') {
      return res.status(400).json({ error: 'Order must be a number' });
    }
    
    const updatedOrder = await NoteOrder.findOneAndUpdate(
      { noteId: new mongoose.Types.ObjectId(noteId) },
      { order, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating note order:', error);
    res.status(500).json({ error: 'Failed to update note order' });
  }
});

// DELETE /api/note-order/:noteId - Remove order for a note
router.delete('/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    
    await NoteOrder.findOneAndDelete({ noteId: new mongoose.Types.ObjectId(noteId) });
    
    res.json({ message: 'Note order removed successfully' });
  } catch (error) {
    console.error('Error removing note order:', error);
    res.status(500).json({ error: 'Failed to remove note order' });
  }
});

// POST /api/note-order/initialize - Initialize orders for all revision notes
router.post('/initialize', async (req: Request, res: Response) => {
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

export default router;
