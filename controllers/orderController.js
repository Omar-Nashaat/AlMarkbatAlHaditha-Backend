const Cart = require('../models/Cart')
const Order = require('../models/Order')
const nodemailer = require('nodemailer')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const schedule = require('node-schedule')
const crypto = require('crypto')

exports.placeOrder = async (req, res) => {
  const sessionId = req.session.userId
  const { name, number, email, address, notes, city, country } = req.body

  try {
    const cart = await Cart.findOne({ sessionId }).populate('items.productId')
    if (!cart || cart.items.length === 0) {
      return res.status(400).send({ message: 'Cart is empty' })
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000)

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    )
    const order = new Order({
      sessionId,
      userDetails: { name, number, email, address, notes, city, country },
      products: cart.items,
      totalAmount,
      status: 'PendingVerification',
      otp,
      otpExpires
    })

    await order.save()
    await Cart.deleteOne({ sessionId })
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD
      }
    })

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'تحقق من طلبك من أشوربانيبال',
      html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f7fc;
              color: #333;
              margin: 0;
              padding: 0;
              direction: rtl;
            }
            .email-container {
              background-color: #ffffff;
              width: 100%;
              max-width: 600px;
              margin: 30px auto;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              color: #292424;
              margin-bottom: 20px;
            }
            .content p{
              font-size: 16px;
              line-height: 1.6;
              color: #292424;
              margin-bottom: 20px;
            }
            .content a {
              color: #007bff;
              text-decoration: none;
              font-weight: bold;
            }
            .button {
              display: block;
              width: 100%;
              background-color: #292424;
              color: white; /* Set button text to white */
              padding: 12px;
              border: none;
              border-radius: 4px;
              text-align: center;
              font-size: 16px;
              text-decoration: none;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #292424;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #aaa;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h2>التحقق من الطلب</h2>
            </div>
            <div class="content">
              <p>مرحباً ${name},</p>
              <p>شكرا لك على تقديم الطلب و إستخدامكم خدماتنا. الرجاء إدخال كلمة المرور لمرة واحدة التالية في الموقع في المكان المخصص له للتحقق من طلبك</p>
              <p>إذا لم تكن قد طلبت ذلك، يمكنك تجاهل هذا البريد الإلكتروني.</p>
              <a class="button" style="color: white;">${otp}</a>
              <p>كلمة المرور صالحة فقط لمدة 15 دقيقة</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} خدمتك. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </body>
      </html>
    `
    }

    await transporter.sendMail(mailOptions)

    res
      .status(200)
      .send({
        message: 'OTP sent to email. Verify your order to confirm.',
        orderId: order._id
      })
  } catch (error) {
    console.error('Error placing order:', error)
    res.status(500).send({ message: 'Error placing order', error })
  }
}

exports.verifyOrder = async (req, res) => {
  const { orderId, otp } = req.body

  try {
    const order = await Order.findById(orderId).populate('products.productId')

    if (!order) {
      return res.status(404).send({ message: 'Order not found' })
    }

    if (order.verified) {
      return res.status(400).send({ message: 'Order already verified' })
    }

    if (order.otp !== otp) {
      return res.status(400).send({ message: 'Invalid OTP' })
    }

    if (order.otpExpires < Date.now()) {
      return res
        .status(400)
        .send({ message: 'OTP expired. Please place a new order.' })
    }
    order.verified = true
    order.status = 'Confirmed'
    await order.save()
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD
      }
    })

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: 'تم استلام طلب جديد تم التحقق منه',
      html: `
        <h2>تم التحقق من الطلب الجديد</h2>
        <p>لقد نجح المستخدم في التحقق من طلبه. فيما يلي التفاصيل:</p>
        
        <h3>تفاصيل المستخدم :</h3>
        <p><strong>الإسم:</strong> ${order.userDetails.name}</p>
        <p><strong>البريد الإلكتروني:</strong> ${order.userDetails.email}</p>
        <p><strong>رقم الهاتف :</strong> ${order.userDetails.number}</p>
        <p><strong>العنوان :</strong> ${order.userDetails.address}, ${
        order.userDetails.city
      }, ${order.userDetails.country}</p>
        <p><strong>ملاحظات إضافية :</strong> ${order.userDetails.notes || 'None'}</p>

        <h3>تفاصيل الطلب :</h3>
        <table border="1" cellspacing="0" cellpadding="5">
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
          ${order.products
            .map(
              item => `
              <tr>
                <td>${item.productId.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
              </tr>
            `
            )
            .join('')}
        </table>

        <h3>Total Amount: $${order.totalAmount.toFixed(2)}</h3>
        <p><strong>الحالة :</strong> تم التأكيد بواسطة العميل</p>

        <p>قم بتسجيل الدخول إلى لوحة الإدارة لمراجعة الطلب.</p>
      `
    }
    await transporter.sendMail(mailOptions)
    res
      .status(200)
      .send({ message: 'Order verified successfully, admin notified' })
  } catch (error) {
    console.error('Error verifying order:', error)
    res.status(500).send({ message: 'Error verifying order', error })
  }
}

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('products.productId')
    res.status(200).send({ message: 'Orders retrieved successfully', orders })
  } catch (error) {
    console.error('Error retrieving orders:', error)
    res.status(500).send({ message: 'Error retrieving orders', error })
  }
}

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params
  const { status, comment } = req.body

  try {
    const validStatuses = ['Confirmed', 'Shipped', 'Delivered', 'Cancelled','PendingVerification']
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ message: 'Invalid status value' })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).send({ message: 'Order not found' })
    }

    order.status = status
    if (comment) {
      order.adminComment = comment
    }
    await order.save()

    res
      .status(200)
      .send({ message: 'Order status updated successfully', order })
  } catch (error) {
    console.error('Error updating order status:', error)
    res.status(500).send({ message: 'Error updating order status', error })
  }
}

// generate daily report
async function generateDailyReport (orders, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const stream = fs.createWriteStream(filePath)

    doc.pipe(stream)

    // Add Report Title and Current Date
    const currentDate = new Date().toDateString() // Get the current date
    doc.fontSize(18).text('Daily Order Report', { align: 'center' })
    doc.fontSize(12).text(`Report Date: ${currentDate}`, { align: 'center' }) // Add current date below title
    doc.moveDown()

    // Iterate over orders and add their details to the report
    orders.forEach((order, index) => {
      doc.fontSize(14).text(`Order ${index + 1} :`)
      doc.fontSize(12).text(`Order ID : ${order._id}`)
      doc.text(`Order Status : ${order.status}`)
      doc.text(`Customer Name : ${order.userDetails.name}`)
      doc.text(`Customer Email : ${order.userDetails.email}`)
      doc.text(`Customer Number : ${order.userDetails.number}`)
      doc.text(`Customer Address : ${order.userDetails.address}`)
      doc.text(
        `Customer Country , City : ${order.userDetails.country}, ${order.userDetails.city}`
      )
      doc.text(`Order Date : ${new Date(order.createdAt).toDateString()}`)
      doc.text('Products :')
      order.products.forEach(product => {
        doc.text(
          `  - ${product.productId.name} : ${product.quantity} x $${product.price}`
        )
      })
      doc.text(`Total Amount : $${order.totalAmount}`)
      if (order.adminComment) {
        doc.text(`Admin Comment : ${order.adminComment}`)
      }
      doc.moveDown()
    })

    doc.end()

    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}

// Endpoint to generate a report for a specific day
exports.generateReportForDate = async (req, res) => {
  try {
    const { date } = req.query

    console.log('Received request to generate report for date:', date)

    if (!date) {
      console.log('No date provided.')
      return res.status(400).send({ message: 'Date is required' })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('Fetching orders between:', startOfDay, 'and', endOfDay)

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('products.productId')

    console.log('Orders fetched:', orders)

    if (!orders.length) {
      console.log('No orders found for the specified date.')
      return res
        .status(404)
        .send({ message: `No orders found for the date: ${date}` })
    }

    const pdfPath = `Orders-report-(${date}).pdf`
    const doc = new PDFDocument()
    const stream = fs.createWriteStream(pdfPath)

    doc.pipe(stream)

    doc.fontSize(18).text(`Order Report for ${date}`, { align: 'center' })
    doc.moveDown()

    orders.forEach((order, index) => {
      doc.fontSize(14).text(`Order ${index + 1}:`)
      doc.fontSize(12).text(`Order ID: ${order._id}`)
      doc.text(`Customer Name: ${order.userDetails.name}`)
      doc.text(`Customer Email: ${order.userDetails.email}`)
      doc.text(`Customer Number: ${order.userDetails.number}`)
      doc.text(`Customer Address: ${order.userDetails.address}`)
      doc.text(
        `Customer Country , City: ${order.userDetails.country}, ${order.userDetails.city}`
      )
      doc.text(`Total Amount: $${order.totalAmount}`)
      doc.text(`Status: ${order.status}`)
      doc.text(`Order Date: ${new Date(order.createdAt).toDateString()}`)
      doc.text('Products:')
      order.products.forEach(product => {
        doc.text(
          `  - ${product.productId.name}: ${product.quantity} x $${product.price}`
        )
      })
      if (order.adminComment) {
        doc.text(`Admin Comment: ${order.adminComment}`)
      }
      doc.moveDown()
    })

    doc.end()

    stream.on('finish', () => {
      console.log('PDF generated successfully.')
      res.download(pdfPath, `Orders-report-(${date}).pdf`, () => {
        console.log('PDF sent to client. Cleaning up...')
        fs.unlinkSync(pdfPath)
      })
    })

    stream.on('error', err => {
      console.error('Error writing PDF stream:', err)
      res
        .status(500)
        .send({ message: 'Error generating PDF', error: err.message })
    })
  } catch (error) {
    console.error('Error generating report for specific date:', error)
    res
      .status(500)
      .send({ message: 'Error generating report', error: error.message })
  }
}

// Endpoint to generate and download the report manually
exports.generateOrderReport = async (req, res) => {
  const currentDate = new Date().toDateString() // Get the current date
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('products.productId')

    if (!orders.length) {
      return res.status(404).send({ message: 'No orders found for today' })
    }

    const pdfPath = `./Daily-orders-report (${currentDate}).pdf`
    await generateDailyReport(orders, pdfPath)

    res.download(pdfPath, `Daily-orders-report (${currentDate}).pdf`, () => {
      fs.unlinkSync(pdfPath) // Clean up after download
    })
  } catch (error) {
    console.error('Error generating daily report:', error)
    res.status(500).send({ message: 'Error generating daily report', error })
  }
}

// Scheduled job to send the report at the end of the day
schedule.scheduleJob('59 23 * * *', async () => {
  // Runs at 11:59 PM daily
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('products.productId')

    if (!orders.length) {
      console.log('No orders found for today. Report not generated.')
      return
    }

    const pdfPath = './daily_order_report.pdf'
    await generateDailyReport(orders, pdfPath)

    // Configure email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'omarnashaat18@gmail.com',
        pass: 'qdoo ytsk cbpp wiqp'
      }
    })

    // Send email
    await transporter.sendMail({
      from: 'omarnashaat18@gmail.com',
      to: 'omarnashaat18@gmail.com',
      subject: 'Daily Order Report',
      text: 'Attached is the daily order report.',
      attachments: [
        {
          filename: 'daily_order_report.pdf',
          path: pdfPath
        }
      ]
    })

    console.log('Daily order report sent to admin.')
    fs.unlinkSync(pdfPath) // Clean up after sending
  } catch (error) {
    console.error('Error sending daily report:', error)
  }
})

// delete order
exports.deleteOrder = async (req, res) => {
  const { orderId } = req.params

  try {
    const order = await Order.findByIdAndDelete(orderId)

    if (!order) {
      return res.status(404).send({ message: 'Order not found' })
    }

    res.status(200).send({ message: 'Order deleted successfully', order })
  } catch (error) {
    console.error('Error deleting order:', error)
    res.status(500).send({ message: 'Error deleting order', error })
  }
}

// filter orders by date
exports.filterOrdersByDate = async (req, res) => {
  const { date } = req.query

  try {
    // Validate date input
    if (!date) {
      return res.status(400).send({ message: 'Date is required' })
    }

    // Parse the input date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0) // Start of the day (00:00:00)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999) // End of the day (23:59:59.999)

    // Fetch orders for the specified day
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('products.productId')

    // Check if any orders exist for the day
    if (!orders.length) {
      return res
        .status(404)
        .send({ message: `No orders found for the date: ${date}` })
    }

    res.status(200).send({ message: 'Orders retrieved successfully', orders })
  } catch (error) {
    console.error('Error filtering orders by date:', error)
    res.status(500).send({ message: 'Error filtering orders by date', error })
  }
}
