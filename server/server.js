const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const cors = require('cors');
const sanitize = require('sanitize-filename');

const upload = multer({ dest: os.tmpdir() });
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Simple health check
app.get('/', (req, res) => res.send('Convert7z server running'));

// Endpoint pour vérifier que 7z est disponible sur le serveur
app.get('/check7z', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn('7z', ['--help'], { shell: true });
      let out = '';
      let err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('close', code => {
        if (code === 0 || out.length > 0) return resolve({ out, err });
        return reject(new Error('7z non trouvé ou erreur lors de l\'exécution'));
      });
      proc.on('error', e => reject(e));
    });

    return res.json({ ok: true, message: '7z disponible' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

/**
 * Endpoint: /convert7z
 * Accepts multipart/form-data files[] and optional field 'compression' (0-9)
 * Returns a .7z archive containing the uploaded files (original filenames preserved)
 */
app.post('/convert7z', upload.array('files[]'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  const compression = Math.max(0, Math.min(9, parseInt(req.body.compression || '9')));

  const tmpDir = path.join(os.tmpdir(), 'convert7z-' + Date.now() + '-' + Math.random().toString(36).slice(2,8));
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Copy files to temp dir using the originalnames (which should be the cleaned names sent by client)
    for (const f of req.files) {
      const originalName = sanitize(f.originalname || f.filename || 'file');
      const dest = path.join(tmpDir, originalName);
      fs.copyFileSync(f.path, dest);
    }

    const outputName = `cleaned_files_${Date.now()}.7z`;
    const outputPath = path.join(os.tmpdir(), outputName);

    // Use 7z to create archive. Use shell and cwd so we can use wildcard
    const cmd = `7z a -t7z -mx=${compression} "${outputPath}" *`;

    await new Promise((resolve, reject) => {
      const proc = spawn(cmd, { shell: true, cwd: tmpDir });
      let stderr = '';
      proc.stderr.on('data', d => stderr += d.toString());
      proc.on('close', code => {
        if (code === 0) return resolve();
        return reject(new Error('7z exited with code ' + code + '\n' + stderr));
      });
      proc.on('error', err => reject(err));
    });

    // Stream the resulting file back
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${outputName}"`);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', () => {
      // Cleanup (async)
      try { fs.rmSync(outputPath); } catch(e){ }
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) { }
      // remove multer temp files
      for (const f of req.files) {
        try { fs.unlinkSync(f.path); } catch(e) { }
      }
    });

  } catch (err) {
    console.error('Conversion error:', err);
    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) { }
    for (const f of req.files || []) {
      try { fs.unlinkSync(f.path); } catch(e) { }
    }

    if (err.code === 'ENOENT') {
      return res.status(500).json({ error: '7z non trouvé. Installez 7-Zip et assurez-vous que la commande `7z` est dans le PATH.' });
    }

    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Convert7z server listening on port ${PORT}`);
  console.log('Requires 7-Zip installed and `7z` available in PATH');
});
