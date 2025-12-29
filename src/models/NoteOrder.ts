import mongoose, { Schema, Document } from 'mongoose';

export interface INoteOrder extends Document {
  noteId: mongoose.Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const noteOrderSchema = new Schema<INoteOrder>({
  noteId: {
    type: Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
    unique: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index for efficient sorting
noteOrderSchema.index({ order: 1 });
noteOrderSchema.index({ noteId: 1 });

export const NoteOrder = mongoose.model<INoteOrder>('NoteOrder', noteOrderSchema);
