import { Request, Response, NextFunction } from 'express';

export const validateNote = (req: Request, res: Response, next: NextFunction) => {
  const { title, content, category, language } = req.body;
  
  // Required field validation
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category is required' });
  }
  
  if (!language || !language.trim()) {
    return res.status(400).json({ error: 'Language is required' });
  }
  
  // Length validation
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be less than 200 characters' });
  }
  
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content must be less than 10,000 characters' });
  }
  
  if (req.body.topicContent && req.body.topicContent.length > 15000) {
    return res.status(400).json({ error: 'Topic content must be less than 15,000 characters' });
  }
  
  if (req.body.codeContent && req.body.codeContent.length > 20000) {
    return res.status(400).json({ error: 'Code content must be less than 20,000 characters' });
  }
  
  // Priority validation
  if (req.body.priority && !['low', 'medium', 'high'].includes(req.body.priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }
  
  // Tags validation
  if (req.body.tags && Array.isArray(req.body.tags)) {
    for (const tag of req.body.tags) {
      if (typeof tag !== 'string' || tag.length > 50) {
        return res.status(400).json({ error: 'Each tag must be a string with less than 50 characters' });
      }
    }
  }
  
  next();
};