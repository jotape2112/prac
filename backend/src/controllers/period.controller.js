const prisma = require('../config/prisma');

const createPeriod = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    const period = await prisma.period.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    });

    res.status(201).json(period);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear periodo' });
  }
};

module.exports = { createPeriod };
