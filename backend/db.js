const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Carrega o ficheiro .env a partir da raiz do projeto
// /backend/db.js -> sobe uma pasta -> / .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Função de ligação à base de dados MongoDB
 * É exportada para ser utilizada pelo servidor Express.
 */
async function connectDB() {
  console.log('🔎 A procurar .env em:', envPath);
  console.log(
    '🔐 MONGO_URI está definido?',
    process.env.MONGO_URI ? 'Sim ✅' : 'Não ❌'
  );

  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        'A variável MONGO_URI não foi encontrada. Verifica o ficheiro .env na raiz do projeto.'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB conectado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao ligar ao MongoDB:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;