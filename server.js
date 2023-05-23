const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mysql = require('mysql');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();

const sql = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db'
});

sql.connect((error) => {
  if (error) {
    throw error;
  }
  console.log('Connected to the database');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/register', (req, res) => {
  if (req.cookies.userId) {
    res.redirect('/index');
  } else {
    res.sendFile(__dirname + '/register.html');
  }
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const insertQuery = 'INSERT INTO utenti (nome_utente, hash_password) VALUES (?, ?)';
  const selectQuery = 'SELECT id FROM utenti WHERE nome_utente = ? AND hash_password = ?';

  sql.query(insertQuery, [username, hashedPassword], (error) => {
    if (error) {
      console.log(error);
      res.redirect('/errorauth');
      return;
    }

    sql.query(selectQuery, [username, hashedPassword], (error, result) => {
      if (error || result.length === 0) {
        console.log(error);
        res.redirect('/errorauth');
        return;
      }

      res.cookie('userId', result[0].id, { maxAge: 3600000, httpOnly: true });
      res.redirect('/index');
    });
  });
});

app.get('/login', (req, res) => {
  if (req.cookies.userId) {
    res.redirect('/index');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const selectQuery = 'SELECT id FROM utenti WHERE nome_utente = ? AND hash_password = ?';

  sql.query(selectQuery, [username, hashedPassword], (error, result) => {
    if (error || result.length === 0) {
      res.redirect('/errorauth');
      return;
    }

    res.cookie('userId', result[0].id, { maxAge: 3600000, httpOnly: true });
    res.redirect('/index');
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/login');
});

app.get('/index', (req, res) => {
  if (req.cookies.userId) {
    res.sendFile(__dirname + '/index.html');
  } else {
    res.redirect('/login');
  }
});

app.get('/api', (req, res) => {
  const peso = parseFloat(req.query.peso);
  const altezza = parseFloat(req.query.altezza);

  if (isNaN(peso) || isNaN(altezza)) {
    res.status(400).json({ error: 'Peso e altezza devono essere numeri validi.' });
    return;
  }

  const ibm = peso / (altezza * altezza);

  let fasciaCorporea = '';
  if (ibm < 16) {
    fasciaCorporea = 'Grave magrezza';
  } else if (ibm >= 16 && ibm < 18.5) {
    fasciaCorporea = 'Sottopeso';
  } else if (ibm >= 18.5 && ibm < 25) {
    fasciaCorporea = 'Normopeso';
  } else if (ibm >= 25 && ibm < 30) {
    fasciaCorporea = 'Sovrappeso';
  } else if (ibm >= 30 && ibm < 35) {
    fasciaCorporea = 'Obeso classe 1';
  } else if (ibm >= 35 && ibm < 40) {
    fasciaCorporea = 'Obeso classe 2';
  } else {
    fasciaCorporea = 'Obeso classe 3';
  }

  res.json({ ibm, fasciaCorporea });
});

app.get('/errorauth', (req, res) => {
  res.sendFile(__dirname + '/errorauth.html');
});

app.get('/', (req, res) => {
  if (req.cookies.userId) {
    res.redirect('/index');
  } else {
    res.redirect('/login');
  }
});

// Avvio del server
app.listen(3000, () => {
  console.log('Server avviato sulla porta 3000');
});
