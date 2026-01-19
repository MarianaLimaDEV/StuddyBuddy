const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Isto localiza o ficheiro .env subindo duas pastas a partir de onde o db.js está
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const connectDB = async () => {
  // Log para sabermos exatamente onde o Node está a procurar o ficheiro
  console.log("Procurando .env em:", envPath);
  console.log("Conteúdo de MONGO_URI:", process.env.MONGO_URI ? "Preenchido ✅" : "Vazio/Undefined ❌");

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("A variável MONGO_URI não foi encontrada. Verifica o nome dentro do ficheiro .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Conectado com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  }
};

connectDB();