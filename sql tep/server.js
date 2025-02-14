const express = require('express');
const sqlite = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const app = express();
const port = 3000;

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


//dipendenze swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const { doesNotMatch } = require('assert');

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

//app.use(express.static(path.join(__dirname, 'sql tep', 'public')));

app.get('/paziente', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sql tep', 'paziente.html'));
});


//sessione google
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

// Inizializza Passport e sessioni
app.use(passport.initialize());
app.use(passport.session());


// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: 'clientid',
    clientSecret: 'clientsecret',
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    // Puoi salvare o gestire il profilo utente qui
    return done(null, profile);
}));

// Serializzazione e deserializzazione utente
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});


// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    // Reindirizza dopo il successo del login tramite Google
    res.redirect('/paziente.html'); 
});

// Middleware per verificare se l'utente è autenticato
function ensureAuthenticated(req, res, next) {
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sql tep', 'public', 'paziente.html'));
});



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
 *   get:
 *     summary: Ottieni la lista degli utenti con filtri opzionali
 *     parameters:
 *       - in: query
 *         name: eta
 *         schema:
 *           type: string
 *           enum: [max20, min21]
 *         description: Filtra gli utenti in base all'età (max20 = meno di 20 anni, min21 = 21 anni o più)
 *     responses:
 *       200:
 *         description: Lista degli utenti
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
 *                       sesso:
 *                         type: string
 *                         enum: [M, F]
 *                       eta:
 *                         type: integer
 *       500:
 *         description: Errore del server
 */

// Endpoint per ottenere la lista degli utenti
app.get('/utentii', (req, res) => {
    const { eta } = req.query;

    let sql = 'SELECT * FROM utentii';
    const params = [];

    // Aggiungi i filtri in base ai parametri della query
    if (eta === 'max20') {
        sql += ' WHERE eta <= 20';
    } else if (eta === 'min21') {
        sql += ' WHERE eta > 20';
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Errore nel database:', err.message);
            return res.status(500).json({ error: 'Errore durante il recupero degli utenti' });
        }
        res.json({ users: rows });
    });
});



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


// Endpoint per restituire gli eventi
app.get('/events', (req, res) => {
    // Esempio di eventi statici (modifica con il tuo database)
    const events = [
      {
        title: 'Visita Medica',
        start: '2024-12-14T10:00:00',
        end: '2024-12-14T11:00:00',
        description: 'Visita di controllo generale'
      },
      {
        title: 'Check-up Fisico',
        start: '2024-12-15T09:00:00',
        end: '2024-12-15T10:00:00',
        description: 'Visita di controllo cardiaco'
      }
    ];
  
    res.json(events);  // Restituisci gli eventi in formato JSON
  });
  


// Avvio del server
app.listen(port, () => {
    console.log(`Server API in esecuzione su http://localhost:${port}`);
});
