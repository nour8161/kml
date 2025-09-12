const express = require('express');
const multer = require('multer');
const basicAuth = require('basic-auth');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const app = express();
const PORT = 3000;

// Compression des réponses
app.use(compression());

// Authentification simple
const USERNAME = 'monami';
const PASSWORD = 'motdepasse';
function auth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== USERNAME || user.pass !== PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="KML Files"');
    return res.status(401).send('Authentification requise.');
  }
  next();
}

// Configuration de l'upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const sanitized = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s/g, "_");
    cb(null, Date.now() + '-' + sanitized);
  }
});
const upload = multer({ storage: storage });

// Page d'accueil
app.get('/', (req, res) => {
  let files = [];
  if (fs.existsSync('./uploads')) {
    files = fs.readdirSync('./uploads').filter(f => f.endsWith('.kml'));
  }
  res.send(`
    <h2>Uploader des fichiers KML</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="kmlfiles" accept=".kml" multiple required />
      <button type="submit">Envoyer</button>
    </form>
    <h3>Fichiers existants :</h3>
    <ul>${files.map(f => `<li>${f}</li>`).join('')}</ul>
    <a href="/viewer">Visualiser sur la carte</a>
  `);
});

// Upload handler
app.post('/upload', upload.array('kmlfiles', 30), (req, res) => {
  const files = req.files.map(f => f.filename);
  res.send(`
    <h2>Fichiers uploadés !</h2>
    <ul>${files.map(f => `<li>${f}</li>`).join('')}</ul>
    <a href="/viewer">Visualiser sur la carte</a>
    <br><br><a href="/">Retour</a>
  `);
});

// Route JSON pour la liste des fichiers KML
app.get('/liste-kml', auth, (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json([]);
    const kmlFiles = files.filter(f => f.endsWith('.kml'));
    res.json(kmlFiles);
  });
});

// Route pour servir les fichiers KML
app.get('/kml/:filename', auth, (req, res) => {
  const file = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(file)) {
    res.set('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.sendFile(file);
  } else {
    res.status(404).send('Fichier introuvable');
  }
});

// Page viewer
app.get('/viewer', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Fichiers statiques
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
