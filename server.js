const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const axios = require('axios');
const qs = require('querystring');

const app = express();
const upload = multer();

const ACR_HOST = 'YOUR_ACRCLOUD_HOST';       // Exemple: 'identify-eu-west-1.acrcloud.com'
const ACR_ACCESS_KEY = 'YOUR_ACRCLOUD_KEY';
const ACR_ACCESS_SECRET = 'YOUR_ACRCLOUD_SECRET';

app.use(express.static('public')); // Pour servir index.html et assets si besoin

app.post('/identify', upload.single('audio'), async (req, res) => {
  try {
    const buffer = req.file.buffer;

    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = ['POST', '/v1/identify', ACR_ACCESS_KEY, 'audio', '1', timestamp].join('\n');
    const signature = crypto.createHmac('sha1', ACR_ACCESS_SECRET).update(stringToSign).digest('base64');

    const formData = {
      access_key: ACR_ACCESS_KEY,
      data_type: 'audio',
      signature_version: '1',
      signature,
      sample_bytes: buffer.length,
      timestamp,
      audio: buffer
    };

    // Pour axios multipart form data
    const FormData = require('form-data');
    const form = new FormData();
    for (const key in formData) {
      form.append(key, formData[key]);
    }

    const response = await axios.post(`https://${ACR_HOST}/v1/identify`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const result = response.data;

    // Extrait le Spotify ID depuis la réponse ACRCloud (ajuste selon la structure)
    let spotify_id = null;
    if (
      result.status.code === 0 &&
      result.metadata &&
      result.metadata.music &&
      result.metadata.music.length > 0
    ) {
      const track = result.metadata.music[0];
      if (track.external_metadata && track.external_metadata.spotify) {
        spotify_id = track.external_metadata.spotify.track.id;
      }
      return res.json({ track: { spotify_id } });
    }

    res.json({ track: null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Identification failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
