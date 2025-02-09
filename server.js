// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configurar directorio temporal
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Configuraciones
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Ruta principal
app.get('/', async (req, res) => {
    try {
        const pdfUrl = req.query.pdfUrl;
        
        if (!pdfUrl) {
            return res.status(400).send('Se requiere una URL de PDF');
        }

        // Validar URL
        try {
            new URL(pdfUrl);
        } catch (e) {
            return res.status(400).send('URL inválida');
        }

        // Generar nombre temporal único
        const nombreArchivo = `pdf_${Date.now()}.pdf`;
        const rutaTemporal = path.join(tempDir, nombreArchivo);

        // Descargar PDF
        const respuesta = await axios({
            url: pdfUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        // Guardar PDF temporalmente
        await fs.promises.writeFile(rutaTemporal, respuesta.data);

        // Programar eliminación del archivo después de 5 minutos
        setTimeout(() => {
            fs.unlink(rutaTemporal, (err) => {
                if (err) console.error('Error al eliminar archivo temporal:', err);
            });
        }, 5 * 60 * 1000);

        // Renderizar vista con la URL del archivo temporal
        res.render('flipbook', { 
            pdfUrl: `/temp/${nombreArchivo}`
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al procesar el PDF');
    }
});

// Servir archivos temporales
app.use('/temp', express.static(tempDir));

const buscarPuertoDisponible = (puertoInicial) => {
    return new Promise((resolve, reject) => {
        const servidor = require('net').createServer();
        
        servidor.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                servidor.close();
                resolve(buscarPuertoDisponible(puertoInicial + 1));
            } else {
                reject(err);
            }
        });

        servidor.listen(puertoInicial, () => {
            servidor.close();
            resolve(puertoInicial);
        });
    });
};

async function iniciarServidor() {
    try {
        const puertoDisponible = await buscarPuertoDisponible(port);
        app.listen(puertoDisponible, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${puertoDisponible}`);
            console.log(`💡 Para usar, visita: http://localhost:${puertoDisponible}/?pdfUrl=URL_DEL_PDF`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

iniciarServidor();