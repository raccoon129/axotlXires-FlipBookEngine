// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs'); // Cambiado para usar el módulo fs completo

const app = express();
const port = process.env.PORT || 3002;

// Asegúrate de crear la carpeta temp si no existe
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Middleware para parsear JSON
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Ruta principal que acepta la URL como query parameter
app.get('/', async (req, res) => {
    try {
        const pdfUrl = req.query.pdfUrl;
        if (!pdfUrl) {
            return res.status(400).send('URL del PDF no proporcionada');
        }

        // Validar la URL
        try {
            new URL(pdfUrl);
        } catch (e) {
            return res.status(400).send('URL inválida');
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const tempPdfPath = path.join(tempDir, `pdf_${timestamp}.pdf`);

        // Descargar el PDF con manejo de errores mejorado
        try {
            const response = await axios({
                url: pdfUrl,
                method: 'GET',
                responseType: 'arraybuffer',
                timeout: 5000, // 5 segundos de timeout
                validateStatus: status => status === 200
            });

            if (!response.headers['content-type'].includes('application/pdf')) {
                throw new Error('El recurso no es un PDF válido');
            }

            await fs.promises.writeFile(tempPdfPath, response.data);
            
            // Renderizar la vista
            res.render('flipbook', { 
                pdfUrl: `/temp/pdf_${timestamp}.pdf`
            });

            // Programar limpieza del archivo
            setTimeout(async () => {
                try {
                    if (fs.existsSync(tempPdfPath)) {
                        await fs.promises.unlink(tempPdfPath);
                        console.log(`Archivo temporal eliminado: ${tempPdfPath}`);
                    }
                } catch (err) {
                    console.error('Error al eliminar archivo temporal:', err);
                }
            }, 5 * 60 * 1000);

        } catch (error) {
            console.error('Error al descargar el PDF:', error);
            return res.status(500).send('Error al descargar el PDF');
        }

    } catch (error) {
        console.error('Error general:', error);
        res.status(500).send('Error al procesar la solicitud del PDF');
    }
});

// Configurar cabeceras de seguridad para archivos temporales
app.use('/temp', (req, res, next) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, 'temp')));

// Agregar esta línea después de los otros middleware
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});