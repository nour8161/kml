const express = require('express');
const multer = require('multer');
const basicAuth = require('basic-auth');
const path = require('path');
const fs = require('fs');
const compression = require('compression');

const app = express();
const PORT = 3000;

app.use(compression());

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

// === PAGE D'ACCUEIL / UPLOAD (RESTAURÉE) ===
app.get('/', (req, res) => {
  let files = [];
  if (fs.existsSync('./uploads')) {
    files = fs.readdirSync('./uploads').filter(f => f.endsWith('.kml')).sort();
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gestion des fichiers KML</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
            .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h2, h3 { color: #0056b3; }
            form { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #e9ecef; }
            input[type="file"] { margin-bottom: 10px; }
            button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background-color: #0056b3; }
            ul { list-style-type: none; padding: 0; }
            li { background-color: #f9f9f9; border: 1px solid #eee; margin-bottom: 5px; padding: 8px 12px; border-radius: 4px; }
            a { color: #007bff; text-decoration: none; font-size: 18px; display: inline-block; margin-top: 15px;}
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Uploader des fichiers KML</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="kmlfiles" accept=".kml" multiple required />
                <button type="submit">Envoyer</button>
            </form>
            <h3>Fichiers existants :</h3>
            ${files.length > 0 ? `<ul>${files.map(f => `<li>${f}</li>`).join('')}</ul>` : '<p>Aucun fichier KML trouvé.</p>'}
            <a href="/viewer">Visualiser sur la carte</a>
        </div>
    </body>
    </html>
  `);
});

// === GESTION DE L'UPLOAD (RESTAURÉ) ===
app.post('/upload', upload.array('kmlfiles', 30), (req, res) => {
    // Redirige simplement vers la page d'accueil qui affichera la nouvelle liste
    res.redirect('/');
});


// === ROUTES POUR LE VISUALISEUR (INCHANGÉES) ===
app.get('/liste-kml', auth, (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error("Erreur de lecture du répertoire 'uploads':", err);
      return res.status(500).json([]);
    }
    const kmlFiles = files.filter(f => f.endsWith('.kml')).sort();
    res.json(kmlFiles);
  });
});

app.get('/kml/:filename', auth, (req, res) => {
  const file = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(file)) {
    res.set('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.sendFile(file);
  } else {
    res.status(404).send('Fichier introuvable');
  }
});

app.get('/viewer', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});