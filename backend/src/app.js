require('dotenv').config();

const express = require('express');
const cors = require('cors');
const testRoutes = require('./routes/test.routes');
const periodRoutes = require('./routes/period.routes');
const nrcRoutes = require('./routes/nrc.routes');
const practiceRoutes = require('./routes/practice.routes');
const notificationRoutes = require('./routes/notification.routes');
const ocrRoutes = require('./routes/ocr.routes');
const startDocRoutes = require("./routes/startdoc.routes");
const directorRoutes = require("./routes/director.routes");
const documentsRoutes = require("./routes/documents.routes");
const evaluationRoutes = require("./routes/evaluation.routes");
const periodImportRoutes = require("./routes/periodImport.routes");
const studentRoutes = require("./routes/student.routes");


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/test', testRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/nrcs', nrcRoutes);
app.use('/api/practices', practiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ocr', ocrRoutes);
app.use("/api/start-docs", startDocRoutes);
app.use("/api/director", directorRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use('/uploads', express.static('uploads'));
app.use("/api/periods", periodImportRoutes);
app.use("/api/students", studentRoutes);


const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Practicas UNAB funcionando 🚀' });
});

app.post('/test-directo', (req, res) => {
  console.log("🔥 TEST DIRECTO");
  res.json({ funcionando: true });
});

module.exports = app;
