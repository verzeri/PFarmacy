const express = require('express');
const sqlite = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API di PFarmacy',
            version: '1.0.0',
            description: 'Documentazione API per l\'app di gestione utentii',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
            },
        ],
    },
    apis: ['./server.js'], // Indica dove Swagger può trovare le specifiche delle API
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Connessione al database
let db = new sqlite.Database('./database.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connesso al database SQlite');
});

app.use(express.json());

// Servire il file HTML per il frontend
app.use(express.static(path.join(__dirname, 'public')));

// Creare la tabella utentii se non esiste
db.run(`CREATE TABLE IF NOT EXISTS utentii (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cognome TEXT,
    email TEXT,
    password TEXT,
    sesso TEXT CHECK(sesso IN ('M', 'F')),
    eta INTEGER
)`);


/**
 * @swagger
 * /utentii:
 *   post:
 *     summary: Registra un nuovo utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               cognome:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               sesso:
 *                 type: string
 *                 enum: [M, F]
 *               eta:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *       400:
 *         description: Richiesta non valida
 *       500:
 *         description: Errore del server
 */

//registrazione
app.post('/utentii', (req, res) => {
    console.log('Dati ricevuti per registrazione:', req.body);
    const { nome, cognome, email, password, sesso, eta } = req.body;

    if (!nome || !cognome || !email || !password || !sesso || !eta) {
        console.error('Errore: campi mancanti');
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const sql = `INSERT INTO utentii (nome, cognome, email, password, sesso, eta) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [nome, cognome, email, password, sesso, eta], function (err) {
        if (err) {
            console.error('Errore nel database:', err.message);
            return res.status(500).json({ error: 'Errore durante la registrazione' });
        }
        res.status(201).json({ message: 'Registrazione avvenuta con successo' });
    });
});



/**
 * @swagger
 * /login:
 *   post:
 *     summary: Effettua il login di un utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 nome:
 *                   type: string
 *                 cognome:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: Credenziali non valide
 */

// Endpoint per il login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM utentii WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore interno del server' });
        }
        if (row) {
            // Restituisce solo il flag di successo
            res.json({ success: true });
        } else {
            // Restituisce un messaggio di errore se le credenziali non sono corrette
            res.json({ success: false, message: 'Email o password errati' });
        }
    });
});

// Avvio del server
app.listen(port, () => {
    console.log(`Server API in esecuzione su http://localhost:${port}`);
});
