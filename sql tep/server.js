const express = require('express');
const sqlite = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

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


// Route per ottenere tutti gli utenti
app.get('/utenti', (req, res) => {
    db.all('SELECT * FROM utenti', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users: rows });
    });
});

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

