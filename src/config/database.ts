import mongoose from 'mongoose';

export const connectToDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Database URL:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials in logs

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false,
      connectTimeoutMS: 10000, // Added connection timeout
      // Removed authMechanism - let MongoDB handle this automatically
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

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔚 MongoDB connection closed due to app termination');
      process.exit(0);
    });

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