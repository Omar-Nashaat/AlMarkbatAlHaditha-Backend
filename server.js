require('dotenv').config()
const express = require('express')
const session = require('express-session')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')

const cartRoutes = require('./routes/cartRoutes')
const productRoutes = require('./routes/productRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const orderRoutes = require('./routes/orderRoutes')
const userRoutes = require('./routes/userRoutes')
const offerRoutes = require('./routes/offerRoutes')

const app = express()
app.use('./uploads', express.static(path.join(__dirname, 'uploads')))

// Middleware
app.use(bodyParser.json())
app.use(
  cors({
    // origin: 'http://localhost:5173',
    origin: 'http://www.almarkabatalhaditha.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Allow cookies and authorization headers
  })
)

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Use true if using HTTPS
      httpOnly: true // Prevents client-side scripts from accessing the cookie
    }
  })
)

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

app.get('/api/create-session', (req, res) => {
  if (!req.session.userId) {
    req.session.userId = `user_${Date.now()}`
  }
  res.send({ sessionId: req.session.userId })
})

// Routes
app.use('/cart', cartRoutes)
app.use('/products', productRoutes)
app.use('/categories', categoryRoutes)
app.use('/orders', orderRoutes)
app.use('/admin', userRoutes)
app.use('/offers', offerRoutes);

const PORT = process.env.PORT || 6000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
