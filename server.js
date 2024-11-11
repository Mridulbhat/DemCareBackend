const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const onboardingRoute = require('./routes/onboarding');
const userRoute = require('./routes/userRoutes');
const welcomeRoute = require('./routes/welcome');
const cron = require("node-cron");
const User = require("./models/User")

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB Cloud
mongoose.connect('mongodb+srv://mridulbhat164:KGk2B3pNOuvCz6Vv@demcarecluster.nn1wx.mongodb.net/')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

cron.schedule("0 0 * * *", async () => {
  try {
    // Reset isDone status for all users' todos
    await User.updateMany(
      {},
      { $set: { "todos.$[].isDone": false } }
    );
    console.log("Daily to-do reset complete");
  } catch (error) {
    console.error("Error resetting to-do items:", error);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('API Running');
});
app.use('/api', onboardingRoute);
app.use('/api/user', userRoute);
app.use('/api', welcomeRoute);

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
