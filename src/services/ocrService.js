const axios = require('axios');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { extraerRut } = require('../utils/extractRut');

// Render permite escritura en /tmp, usamos carpeta configurable para archivos temporales.
const TMP_DIR = process.env.TMP_DIR || path.join(__dirname, '..', '..', 'tmp');

const shouldLog = () => process.env.DEBUG_OCR === 'true';
const isImageContent = (headers = {}) => {
  const ct = headers['content-type'] || headers['Content-Type'];
  return ct && ct.toLowerCase().startsWith('image/');
};

exports.procesarOCR = async (req, res) => {
  const { imageUrl } = req.body || {};

  if (!imageUrl) {
    return res.status(400).json({ ok: false, error: 'Falta imageUrl' });
  }

  const fileName = `${uuidv4()}.jpg`;
  const filePath = path.join(TMP_DIR, fileName);

  try {
    await fs.mkdir(TMP_DIR, { recursive: true });

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    if (!isImageContent(response.headers)) {
      const ct = response.headers['content-type'] || 'desconocido';
      return res.status(400).json({
        ok: false,
        error: 'La URL no devuelve una imagen (content-type inválido)',
        detalle: ct,
      });
    }

    await fs.writeFile(filePath, response.data);

    let processed;
    try {
      processed = await sharp(filePath)
        .grayscale()
        .normalize()
        .resize({ width: 1200, withoutEnlargement: true })
        .toBuffer();
    } catch (imgErr) {
      if (shouldLog()) console.error('Error al procesar imagen', imgErr);
      return res.status(400).json({
        ok: false,
        error: 'Imagen no soportada por el procesador',
        detalle: imgErr.message,
      });
    }

    const result = await Tesseract.recognize(processed, 'spa', {
      logger: (msg) => {
        if (shouldLog()) console.log(msg);
      },
    });

    const texto = result.data.text || '';
    const ruts = extraerRut(texto);

    return res.json({
      ok: true,
      texto,
      ruts,
      confidence: result.data.confidence,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      error: 'Error interno',
      detalle: err.message,
    });
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      if (shouldLog()) {
        console.warn('No se pudo borrar el archivo temporal', unlinkError.message);
      }
    }
  }
};
