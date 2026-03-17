const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");

async function main() {
  const hash = await bcrypt.hash("123456", 10);

  const result = await prisma.user.updateMany({
    where: { password: "IMPORTADO" },
    data: { password: hash },
  });

  console.log("Usuarios actualizados:", result.count);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });