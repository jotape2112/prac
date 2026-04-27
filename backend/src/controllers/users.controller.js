const prisma = require("../config/prisma");

const listUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const where = { active: true };
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

module.exports = { listUsers };