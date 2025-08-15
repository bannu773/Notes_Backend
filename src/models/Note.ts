import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  title: string;
  content: string;
  tags: string[];
  category: string;
  programmingLanguage: string; // Renamed from 'language' to avoid MongoDB text search conflict
  description?: string;
  isRevision: boolean;
  priority: 'low' | 'medium' | 'high';
  codeContent?: string;
  topicContent?: string;
  type: 'note';
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  category: {
    type: String,
    required: true,
    trim: true,
  },
  programmingLanguage: { // Renamed from 'language'
    type: String,
    required: true,
    default: 'javascript',
    trim: true
  },
  description: {
    type: String,
    trim: true,
  },
  isRevision: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  codeContent: {
    type: String,
  },
  topicContent: {
    type: String,
  },
  type: {
    type: String,
    default: 'note',
    immutable: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better query performance
noteSchema.index({ category: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ isRevision: 1 });
noteSchema.index({ priority: 1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ updatedAt: -1 });

// Text search index (no longer conflicts with language field)
noteSchema.index({
  title: 'text',
  content: 'text',
  topicContent: 'text',
  tags: 'text'
});

export const Note = mongoose.model<INote>('Note', noteSchema);