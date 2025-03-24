# PFarmacy

1.Effettuare download di Docker(https://www.docker.com/).
2.Scaricare la repository di github in formato zip.
3.Estrarre il contenuto dalla cartella.
4.Entrare nella cartella "sql tep".
5.All'interno di "sql tep" creare due file di testo con i loro relativi contenuti e da rinominare come segue:

-"Dockerfile"
FROM node:14

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione e installa le dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto dei file dell'applicazione
COPY . .

# Espone la porta su cui gira l'applicazione (esempio: 3000)
EXPOSE 3000

# Comando per avviare l'applicazione
CMD ["node", "server.js"]

-"docker-compose.yml"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - .:/app
    stdin_open: true
    tty: true

6.Inserire, sempre nella cartella "sql tep", il file ".env"(da passare tramite mail o chiavetta)
7.Aprire la cartella "sql tep" nel terminal(es. promt dei comandi), eseguire il comando "docker-compose up --build -d" ed attendere la fine delle operazioni.
8.Digitare "http://localhost:3000/" nel browser.

### Descrizione
Un'app che aiuta gli utenti con esigenze farmaceutiche a gestire la propria routine, permettendo di impostare promemoria per l'assunzione dei farmaci e di scrivere note per consentire ai medici di monitorarne i progressi. 


### Tag Line
"Gestisci la tua salute, un promemoria alla volta."


### Soggetti Interessati
Persone di ogni età con esigenze farmacologiche e necessità di gestirne l’assunzione in modo regolare.


### Problema
PFarmacy risolve il problema di creare e mantenere una routine regolare per l’assunzione dei medicinali, riducendo così il rischio di dimenticanze o dosaggi irregolari.


### Competitor
- **MyTherapy**
- **TOM Medication**
- **Mediteo**


### Tecnologie
- **Frontend**: HTML, CSS, JS 
- **Backend**: Node.js, Express.js 
- **Database**: SQLite 


### Requisiti Funzionali

1. **Accesso per contattare il medico di base**:
   - Possibilità di inviare messaggi o richieste direttamente al medico di riferimento attraverso l'applicazione.
   - Notifiche di risposta o aggiornamenti dal medico.

2. **Sistema di notifiche**:
   - Invio automatico di avvisi e promemoria.
   - Notifiche personalizzate per pazienti e medici.

3. **Sincronizzazione dei dati**:
   - Sincronizzazione automatica e continua dei dati su più dispositivi.
   - Aggiornamento istantaneo delle informazioni in tempo reale su tutte le piattaforme coinvolte.

4. **Gestione dei profili utente**:
   - Creazione e gestione di profili utente per pazienti e medici.
   - Differenziazione dei livelli di accesso in base al ruolo (paziente, medico).

5. **Funzionalità di registrazione**:
   - Sistema di registrazione per nuovi utenti, con la possibilità di registrarsi come pazienti o medici.
   - Verifica dell’identità e autenticazione sicura durante la registrazione.

6. **Database centralizzato dei pazienti**:
   - Archiviazione sicura e protetta dei dati relativi ai pazienti.
   - Accesso riservato solo al personale medico autorizzato.

7. **Motore di ricerca per pazienti**:
   - Funzione di ricerca avanzata per filtrare e trovare rapidamente i profili dei pazienti in base a nome, cognome o altri parametri.


### Requisiti Non Funzionali

1. **Sicurezza**:
   - Crittografia dei dati scambiati tra pazienti e medici.
   - Protezione dei dati personali e sensibili in conformità con le normative (GDPR).

2. **Prestazioni**:
   - Il sistema deve supportare la sincronizzazione dei dati in tempo reale senza rallentamenti.
   - Velocità di risposta rapida per le funzioni di ricerca e invio messaggi.

3. **Scalabilità**:
   - Il sistema deve essere in grado di gestire un aumento del numero di utenti senza perdita di performance.

4. **Usabilità**:
   - Interfaccia user-friendly per facilitare l'uso sia da parte di pazienti che di medici.
   - Facilità di navigazione e accesso rapido alle funzioni principali.

5. **Affidabilità**:
   - Il sistema deve garantire un'alta disponibilità con minimi tempi di inattività.
   - Backup periodici per evitare perdita di dati.

6. **Compatibilità**:
   - L'applicazione deve essere compatibile con i principali sistemi operativi (iOS, Android, Windows, macOS) e dispositivi (smartphone, tablet, PC).



### Requisiti di Dominio

1. **Interazione medico-paziente**:
   - Il sistema deve facilitare la comunicazione tra medici e pazienti, rispettando le regole di riservatezza e deontologia medica.

2. **Gestione dei dati sanitari**:
   - I dati dei pazienti devono essere gestiti in conformità con le normative vigenti in materia di privacy e protezione dei dati sanitari (es. GDPR).
   
3. **Ruoli e autorizzazioni**:
   - I medici devono avere un accesso differenziato rispetto ai pazienti per visualizzare, modificare e gestire i dati clinici.
   - I pazienti possono accedere solo ai propri dati e comunicare con il proprio medico.


### Diagramma dei casi d'uso

![4e4098dd](https://github.com/user-attachments/assets/903232ab-799c-4e68-8ed4-80e08733c782)
