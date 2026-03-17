const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  res.json(notifications);
});

module.exports = router;