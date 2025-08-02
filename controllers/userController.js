const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const CryptoJS = require('crypto-js')
const express = require('express')
const nodemailer = require('nodemailer')
require('dotenv').config()

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find the user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'لم يتم العثور على المستخدم' })
    }

    // Decrypt the password
    const decryptedPassword = CryptoJS.AES.decrypt(
      password,
      'a0f1e2d3c4b5a6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3' // Must match the key used in the frontend
    ).toString(CryptoJS.enc.Utf8)

    // Compare the decrypted password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(
      decryptedPassword,
      user.password
    )
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'كلمة المرور غير صالحة' })
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error logging in:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.registerUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // Decrypt the password
    const decryptedPassword = CryptoJS.AES.decrypt(
      password,
      'a0f1e2d3c4b5a6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3'
    ).toString(CryptoJS.enc.Utf8)

    

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(decryptedPassword, salt)

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword
    })

    await newUser.save()

    res.status(201).json({ message: 'User created successfully.' })
  } catch (error) {
    console.error('Error registering user:', error.message)
    res.status(500).json({ message: 'Server error' })
  }
}

// Contact endpoint
exports.contact = async (req, res) => {
  const { firstname, lastname, email, message } = req.body

  if (!firstname || !lastname || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  try {
    // Nodemailer transporter setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'omarnashaat18@gmail.com',
        pass: 'qdoo ytsk cbpp wiqp'
      }
    })

    // Email options
    const mailOptions = {
      from: email,
      to: 'omarnashaat18@gmail.com',
      subject: `New Contact Form Submission from ${firstname} ${lastname}`,
      text: `Name: ${firstname} ${lastname}\nEmail: ${email}\nMessage: ${message}`
    }

    // Send email
    await transporter.sendMail(mailOptions)

    res.status(200).json({ message: 'Message sent successfully!' })
  } catch (error) {
    console.error('Email error:', error)
    res.status(500).json({ error: 'Failed to send the message.' })
  }
}
