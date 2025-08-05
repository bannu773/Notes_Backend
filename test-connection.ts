// Simple MongoDB connection test
// Run this with: npx ts-node test-connection.ts

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      return;
    }

    console.log('🔄 Testing MongoDB connection...');
    console.log('📍 Connecting to:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB connection successful!');
    
    // Drop existing indexes to clear any conflicts
    try {
      await mongoose.connection.db.collection('notes').dropIndexes();
      console.log('🗑️ Cleared existing indexes');
    } catch (error) {
      console.log('ℹ️ No existing indexes to clear (this is normal for new databases)');
    }
    
    // Test creating a simple document with the new schema
    const testSchema = new mongoose.Schema({ 
      title: String,
      content: String,
      programmingLanguage: { type: String, default: 'javascript' },
      category: String,
      tags: [String],
      isRevision: Boolean,
      priority: String
    });
    const TestModel = mongoose.model('TestNote', testSchema);
    
    const testNote = await TestModel.create({ 
      title: 'Test Note',
      content: 'This is a test note',
      programmingLanguage: 'javascript',
      category: 'Testing',
      tags: ['test'],
      isRevision: true,
      priority: 'medium'
    });
    
    console.log('✅ Database write test successful!');
    console.log('📝 Created test note with ID:', testNote._id);
    
    await TestModel.deleteMany({ title: 'Test Note' });
    console.log('✅ Database delete test successful!');
    
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔑 Authentication Issue - Check:');
      console.log('  • Username and password are correct');
      console.log('  • Database user exists in MongoDB Atlas');
      console.log('  • User has proper database permissions');
    }
    
    if (error.message.includes('language override unsupported')) {
      console.log('\n🔤 Language Override Issue - SHOULD BE FIXED NOW:');
      console.log('  • Renamed language field to programmingLanguage');
      console.log('  • This error should no longer occur');
    }
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Network Issue - Check:');
      console.log('  • Internet connection is working');
      console.log('  • MongoDB Atlas cluster is running');
      console.log('  • Cluster URL is correct');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testConnection();