import mongoose from 'mongoose';

export const connectToDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Database URL:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Minimal options - only include well-supported options for Render deployment
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, options);
    
    console.log('🗄️  Connected to MongoDB successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📤 MongoDB disconnected');
    });

    // Only add SIGINT handler if not in production (Render handles this)
    if (process.env.NODE_ENV !== 'production') {
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🔚 MongoDB connection closed due to app termination');
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your MongoDB Atlas username and password');
    console.log('2. Verify your IP address is whitelisted in Network Access');
    console.log('3. Ensure the database user has proper permissions');
    console.log('4. Check if the cluster is active and running');
    throw error;
  }
};