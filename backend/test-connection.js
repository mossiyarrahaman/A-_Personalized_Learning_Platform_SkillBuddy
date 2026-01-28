const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://MossiyarRahaman123:lu2vBCfcO4EaPXzs@cluster0.vlxiynx.mongodb.net//skillbuddy?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  });