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
            description: 'Documentazione API per l\'app di gestione utenti',
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

// Creare la tabella utenti se non esiste
db.run(`CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    cognome TEXT,
    email TEXT,
    password TEXT
)`);

/**
 * @swagger
 * /utenti:
 *   post:
 *     summary: Aggiunge un nuovo utente
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
 *     responses:
 *       200:
 *         description: Utente creato con successo
 */

// Route per aggiungere un utente
app.post('/utenti', (req, res) => {
    const { nome, cognome, email, password } = req.body;
    console.log('Dati ricevuti per la registrazione:', { nome, cognome, email, password }); // Log dei dati
    db.run(`INSERT INTO utenti (nome, cognome, email, password) 
            VALUES (?, ?, ?, ?)`, 
        [nome, cognome, email, password], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Nuovo utente creato', id: this.lastID });
    });
});

/**
 * @swagger
 * /utenti:
 *   get:
 *     summary: Recupera l'elenco degli utenti
 *     parameters:
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Ordine alfabetico (ascendente o discendente)
 *     responses:
 *       200:
 *         description: Elenco degli utenti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nome:
 *                         type: string
 *                       cognome:
 *                         type: string
 *                       email:
 *                         type: string
 */

// Route per ottenere tutti gli utenti
app.get('/utenti', (req, res) => {
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
    db.all(`SELECT * FROM utenti ORDER BY nome ${order}`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users: rows });
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
    
    db.get('SELECT * FROM utenti WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore interno del server' });
        }
        if (row) {
            // Restituisce i dati dell'utente se la login ha successo
            res.json({ success: true, nome: row.nome, cognome: row.cognome, email: row.email });
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

