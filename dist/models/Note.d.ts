import mongoose, { Document } from 'mongoose';
export interface INote extends Document {
    title: string;
    content: string;
    tags: string[];
    category: string;
    programmingLanguage: string;
    description?: string;
    isRevision: boolean;
    priority: 'low' | 'medium' | 'high';
    codeContent?: string;
    topicContent?: string;
    type: 'note';
    createdAt: Date;
    updatedAt: Date;
}
export declare const Note: mongoose.Model<INote, {}, {}, {}, mongoose.Document<unknown, {}, INote, {}, {}> & INote & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Note.d.ts.map