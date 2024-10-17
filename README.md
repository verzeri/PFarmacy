# PFarmacy
{
  "registrations": [
    {
      "request": {
        "name": "Mario",
        "surname": "Rossi",
        "email": "mario.rossi@example.com",
        "password": "password123"
      },
      "response": {
        "status": "success",
        "message": "Registration successful",
        "user": {
          "id": 1,
          "name": "Mario",
          "surname": "Rossi",
          "email": "mario.rossi@example.com"
        }
      }
    },
    {
      "request": {
        "name": "Luisa",
        "surname": "Bianchi",
        "email": "luisa.bianchi@example.com",
        "password": "pass456"
      },
      "response": {
        "status": "success",
        "message": "Registration successful",
        "user": {
          "id": 2,
          "name": "Luisa",
          "surname": "Bianchi",
          "email": "luisa.bianchi@example.com"
        }
      }
    },
    {
      "request": {
        "name": "Giovanni",
        "surname": "Verdi",
        "email": "giovanni.verdi@example.com",
        "password": "verdi789"
      },
      "response": {
        "status": "success",
        "message": "Registration successful",
        "user": {
          "id": 3,
          "name": "Giovanni",
          "surname": "Verdi",
          "email": "giovanni.verdi@example.com"
        }
      }
    },
    {
      "request": {
        "name": "Elena",
        "surname": "Neri",
        "email": "elena.neri@example.com",
        "password": "elena999"
      },
      "response": {
        "status": "success",
        "message": "Registration successful",
        "user": {
          "id": 4,
          "name": "Elena",
          "surname": "Neri",
          "email": "elena.neri@example.com"
        }
      }
    }
  ]
}



{
  "notifications_sent": [
    {
      "id": 1,
      "title": "Promemoria",
      "message": "Ricordati i farmaci",
      "timestamp": "2024-09-27T08:30:00Z",
      "status": "delivered",
      "user_id": 101,
      "app_id": "com.example.app"
    },
    {
      "id": 2,
      "title": "Messaggio",
      "message": "Hai un nuovo messaggio",
      "timestamp": "2024-09-26T12:00:00Z",
      "status": "delivered",
      "user_id": 102,
      "app_id": "com.example.app"
    },
    {
      "id": 3,
      "title": "Avviso",
      "message": "Hai dimenticato di prendere i farmaci",
      "timestamp": "2024-09-25T15:45:00Z",
      "status": "delivered",
      "user_id": 103,
      "app_id": "com.example.app"
    },
    {
      "id": 4,
      "title": "Appuntamento",
      "message": "Hai un nuovo appuntamento fissato",
      "timestamp": "2024-09-24T10:20:00Z",
      "status": "delivered",
      "user_id": 104,
      "app_id": "com.example.app"
    }
  ]
}



-Accesso per contattare il medico di base: possibilità di inviare messaggi o richieste direttamente al medico di riferimento.

-Sistema di notifiche: invio di avvisi e promemoria per aggiornamenti, appuntamenti o eventi rilevanti.

-Sincronizzazione dei dati: aggiornamento continuo e automatico dei dati tra diversi dispositivi e piattaforme.

-Gestione dei profili utente: creazione e amministrazione di profili personali per pazienti e medici, con livelli di accesso personalizzati.

-Funzionalità di registrazione: sistema di registrazione per nuovi utenti (pazienti o medico).

-Database centralizzato dei pazienti: archiviazione sicura e strutturata dei dati di accesso dei pazienti, con accesso riservato al personale medico autorizzato.

-Motore di ricerca per pazienti: funzionalità avanzata per cercare e filtrare i profili dei pazienti in base a nome e cognome.




### Requisiti Funzionali:

1. **Accesso per contattare il medico di base**:
   - Possibilità di inviare messaggi o richieste direttamente al medico di riferimento attraverso l'applicazione.
   - Notifiche di risposta o aggiornamenti dal medico.

2. **Sistema di notifiche**:
   - Invio automatico di avvisi e promemoria per appuntamenti, eventi medici rilevanti o aggiornamenti importanti.
   - Notifiche personalizzate per pazienti e medici.

3. **Sincronizzazione dei dati**:
   - Sincronizzazione automatica e continua dei dati su più dispositivi.
   - Aggiornamento istantaneo delle informazioni in tempo reale su tutte le piattaforme coinvolte (app mobile, web, etc.).

4. **Gestione dei profili utente**:
   - Creazione e gestione di profili utente per pazienti e medici.
   - Differenziazione dei livelli di accesso in base al ruolo (paziente, medico, amministratore).

5. **Funzionalità di registrazione**:
   - Sistema di registrazione per nuovi utenti, con la possibilità di registrarsi come pazienti o medici.
   - Verifica dell’identità e autenticazione sicura durante la registrazione.

6. **Database centralizzato dei pazienti**:
   - Archiviazione sicura e protetta dei dati relativi ai pazienti.
   - Accesso riservato solo al personale medico autorizzato.

7. **Motore di ricerca per pazienti**:
   - Funzione di ricerca avanzata per filtrare e trovare rapidamente i profili dei pazienti in base a nome, cognome o altri parametri.

---

### Requisiti Non Funzionali:

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

---

### Requisiti di Dominio:

1. **Interazione medico-paziente**:
   - Il sistema deve facilitare la comunicazione tra medici e pazienti, rispettando le regole di riservatezza e deontologia medica.

2. **Gestione dei dati sanitari**:
   - I dati dei pazienti devono essere gestiti in conformità con le normative vigenti in materia di privacy e protezione dei dati sanitari (es. GDPR).
   
3. **Ruoli e autorizzazioni**:
   - I medici devono avere un accesso differenziato rispetto ai pazienti per visualizzare, modificare e gestire i dati clinici.
   - I pazienti possono accedere solo ai propri dati e comunicare con il proprio medico.

https://yuml.me/pfarmacy/4e4098dd.svg
