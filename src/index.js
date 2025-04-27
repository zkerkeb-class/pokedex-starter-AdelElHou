// index.js (backend complet avec JWT, login, pokemons protégés)

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import Pokemon from './models/Pokemon.js';
import Type from './models/Type.js';
import User from './models/User.js';
import { authenticate } from './middlewares/authMiddleware.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // ⬆️ Obligatoire pour req.body en POST
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Connecté à MongoDB");
}).catch((err) => {
  console.error("❌ Erreur de connexion à MongoDB :", err);
});

// Route inscription
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Définir les Pokémon de départ ici
    const starterPokemons = [1, 4, 7]; // Bulbizarre, Salamèche, Carapuce

    const user = await User.create({
      email,
      password: hashedPassword,
      ownedPokemons: starterPokemons // Ajouter les Pokémon de départ
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.status(201).json({ 
      token,
      user: {
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
});

// Route login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Champs requis." });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Utilisateur inconnu." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Mot de passe incorrect." });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ 
    token,
    user: {
      email: user.email
    }
  });
});

// Route protégée pour les pokémons de l'utilisateur
app.get("/api/pokemons", authenticate, async (req, res) => {
  try {
    // Récupérer l'utilisateur avec ses Pokémon
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Récupérer uniquement les Pokémon possédés par l'utilisateur
    const pokemons = await Pokemon.find({
      id: { $in: user.ownedPokemons }
    });

    const typesFromDB = await Type.find();
    const typesWithImages = typesFromDB.reduce((acc, t) => {
      acc[t.name.toLowerCase()] = t.image;
      return acc;
    }, {});

    res.status(200).send({
      types: typesWithImages,
      pokemons
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).send({ error: "Erreur lors de la récupération des pokémons" });
  }
});

app.get("/", (req, res) => {
  res.send("Bienvenue sur l'API Pokémon");
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});