// scripts/createAdmin.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'admin@pokedex.com';
    const plainPassword = 'admin123'; // Mot de passe à modifier si besoin
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️ Utilisateur déjà existant :', email);
    } else {
      await User.create({ email, password: hashedPassword });
      console.log('✅ Utilisateur admin créé :', email);
    }

    process.exit();
  } catch (err) {
    console.error('❌ Erreur :', err);
    process.exit(1);
  }
};

run();
