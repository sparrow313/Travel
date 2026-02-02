import { prisma } from "./lib/prisma.js";

async function main() {
  // Create a new user
  const user = await prisma.user.create({
    data: {
      username: "Alice",
      email: "alice@prisma.io",
      password: "securepassword123",
    },
  });
  console.log("Created user:", user);

  // Fetch all users
  const allUsers = await prisma.user.findMany();
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
