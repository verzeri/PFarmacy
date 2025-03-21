const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const app = express();
const port = 3000;

// Importa DBMock anziché SQLite
const DBMock = require('./DBMock');
const db = new DBMock();

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

app.use(express.json());

// Configurazione delle sessioni
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 ore
}));

// **Configurazione Handlebars come view engine**
const hbs = require('hbs');
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'public')); // Assicurati che le tue pagine .hbs siano nella cartella 'public' o adatta il percorso

// Servire i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Inizializza Passport e sessioni
app.use(passport.initialize());
app.use(passport.session());

// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: '',
    clientSecret: '',
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

// Middleware per verificare se l'utente è autenticato
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/');
}

// Middleware per verificare se l'utente è admin
function ensureAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.ruolo === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Accesso negato' });
}

// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/'
}), (req, res) => {
    // Reindirizza dopo il successo del login tramite Google
    // **Ora reindirizza alla route per la pagina paziente**
    res.redirect('/paziente');
});

// Route principale (login page)
app.get('/', (req, res) => {
    // **Ora renderizza index.hbs**
    res.render('index');
});

// Route per la pagina paziente (protetta da autenticazione)
app.get('/paziente', ensureAuthenticated, (req, res) => {
    // **Ora renderizza paziente.hbs e passa i dati dell'utente**
    res.render('paziente', { patient: { nome: req.session.user.nome, cognome: req.session.user.cognome } });
});

// Route per la pagina admin (protetta da autenticazione admin)
app.get('/admin', ensureAdmin, (req, res) => {
    // **Ora renderizza admin.hbs e passa i dati dell'admin e degli utenti**
    res.render('admin', { admin: { nome: req.session.user.nome }, users: db.getAllUsers() });
});

// Route per la pagina dati utente (protetta da autenticazione)
app.get('/dati', ensureAuthenticated, (req, res) => {
    // **Ora renderizza dati.hbs e passa i dati dell'utente**
    res.render('dati', { user: req.session.user });
});

/**
 * @swagger
 * /api/check-auth:
 * get:
 * summary: Verifica l'autenticazione dell'utente
 * responses:
 * 200:
 * description: Stato di autenticazione dell'utente
 */
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            isAuthenticated: true,
            role: req.session.user.ruolo,
            nome: req.session.user.nome
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

/**
 * @swagger
 * /logout:
 * post:
 * summary: Effettua il logout dell'utente
 * responses:
 * 200:
 * description: Logout effettuato con successo
 */
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        // **Ora reindirizza alla route principale**
        res.redirect('/');
    });
});

/**
 * @swagger
 * /utentii:
 * get:
 * summary: Ottieni la lista degli utenti con filtri opzionali
 * parameters:
 * - in: query
 * name: eta
 * schema:
 * type: string
 * enum: [max20, min21]
 * description: Filtra gli utenti in base all'età (max20 = meno di 20 anni, min21 = 21 anni o più)
 * responses:
 * 200:
 * description: Lista degli utenti
 * 500:
 * description: Errore del server
 */
app.get('/utentii', (req, res) => {
    const { eta } = req.query;

    // Ottieni tutti gli utenti
    let users = db.getAllUsers();

    // Filtra in base all'età se necessario
    if (eta === 'max20') {
        users = users.filter(user => user.eta <= 20);
    } else if (eta === 'min21') {
        users = users.filter(user => user.eta > 20);
    }

    res.json({ users });
});

/**
 * @swagger
 * /utentii/{id}:
 * get:
 * summary: Ottiene un utente specifico per ID
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Dettagli dell'utente
 * 404:
 * description: Utente non trovato
 */
app.get('/utentii/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = db.getUserById(userId);

    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ error: 'Utente non trovato' });
    }
});

/**
 * @swagger
 * /utentii:
 * post:
 * summary: Registra un nuovo utente
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * nome:
 * type: string
 * cognome:
 * type: string
 * email:
 * type: string
 * password:
 * type: string
 * sesso:
 * type: string
 * enum: [M, F]
 * eta:
 * type: integer
 * responses:
 * 201:
 * description: Utente registrato con successo
 * 400:
 * description: Richiesta non valida
 * 500:
 * description: Errore del server
 */
app.post('/utentii', (req, res) => {
    console.log('Dati ricevuti per registrazione:', req.body);
    const { nome, cognome, email, password, sesso, eta } = req.body;

    if (!nome || !cognome || !email || !password || !sesso || !eta) {
        console.error('Errore: campi mancanti');
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    try {
        const newUser = db.createUser({ nome, cognome, email, password, sesso, eta });
        res.status(201).json({ message: 'Registrazione avvenuta con successo' });
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ error: 'Errore durante la registrazione' });
    }
});

/**
 * @swagger
 * /utentii/{id}:
 * put:
 * summary: Aggiorna un utente esistente
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * responses:
 * 200:
 * description: Utente aggiornato con successo
 * 404:
 * description: Utente non trovato
 */
app.put('/utentii/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    const updatedUser = db.updateUser(userId, updates);
    if (updatedUser) {
        res.json({ success: true, user: updatedUser });
    } else {
        res.status(404).json({ error: 'Utente non trovato' });
    }
});

/**
 * @swagger
 * /utentii/{id}:
 * delete:
 * summary: Elimina un utente
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Utente eliminato con successo
 * 404:
 * description: Utente non trovato
 */
app.delete('/utentii/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const success = db.deleteUser(userId);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Utente non trovato' });
    }
});

/**
 * @swagger
 * /login:
 * post:
 * summary: Effettua il login di un utente
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * 200:
 * description: Login effettuato con successo
 * 401:
 * description: Credenziali non valide
 */
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const result = db.verifyCredentials(email, password);
    if (result.success) {
        // Memorizza l'utente nella sessione
        req.session.user = result.user;

        // Controllo per la redirezione in base al ruolo
        const redirectPage = result.user.ruolo === 'admin' ? '/admin' : '/paziente';

        res.json({
            success: true,
            redirectPage
        });
    } else {
        res.json({
            success: false,
            message: result.message
        });
    }
});

/**
 * @swagger
 * /events:
 * get:
 * summary: Ottiene gli eventi del calendario
 * responses:
 * 200:
 * description: Lista degli eventi
 */
app.get('/events', (req, res) => {
    // Esempio di eventi statici
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

    res.json(events);
});

app.post('/update-password', ensureAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id; // Assumendo che l'ID utente sia nella sessione

    const user = db.getUserById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Utente non trovato.' });
    }

    if (user.password === currentPassword) { // In un sistema reale, usa l'hashing
        const updatedUser = db.updateUser(userId, { password: newPassword }); // Anche qui, in realtà dovresti hasharla
        if (updatedUser) {
            return res.json({ success: true, message: 'Password aggiornata con successo.' });
        } else {
            return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento della password.' });
        }
    } else {
        return res.status(401).json({ success: false, message: 'La password attuale non è corretta.' });
    }
});

// Avvio del server
app.listen(port, () => {
    console.log(`Server API in esecuzione su http://localhost:${port}`);
});