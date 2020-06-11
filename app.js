const express = require('express')
const app = express()
app.use(express.static('public'));
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));


const mysql = require('mysql')

//Create conncetion
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'blood_db'
});

//Connect
db.connect((err) => {
  if (err)
    throw err;
  console.log("MySql Connected...");
});

//Creating blood-db database
let sql = 'CREATE DATABASE IF NOT EXISTS blood_db';
db.query(sql, (err, result) => {
  if (err) throw err;
  console.log('Database blood_db created !');
  console.log(result);
});



app.get("/", (req, res) => {
  res.sendFile('index.html');
});

app.get("/continue", (req, res) => {
  let sql = 'CREATE TABLE IF NOT EXISTS blood (id int AUTO_INCREMENT, type VARCHAR(255), PRIMARY KEY(id))';
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('blood table created');
  });

  sql = 'CREATE TABLE IF NOT EXISTS donor (id int AUTO_INCREMENT, fname VARCHAR(255), lname VARCHAR(255), mobile VARCHAR(255),blood_id int, PRIMARY KEY(id),FOREIGN KEY(blood_id) REFERENCES blood(id) )';
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('donor table created');
  });

  sql = 'CREATE TABLE IF NOT EXISTS hospital(id int AUTO_INCREMENT, name VARCHAR(255), city VARCHAR(255), pin VARCHAR(255), PRIMARY KEY(id))';
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('hospital table created');
  });

  sql = 'CREATE TABLE IF NOT EXISTS stock(id int AUTO_INCREMENT, blood_id int,hospital_id int,units int UNSIGNED, PRIMARY KEY(id), FOREIGN KEY(blood_id) REFERENCES blood(id), FOREIGN KEY(hospital_id) REFERENCES hospital(id))';
  db.query(sql, (err, result) => {
    if (err) throw err;
    console.log('stock table created');
  });

  res.sendFile(__dirname + '/public/home.html');
});

app.get('/donor', (req, res) => {
  res.sendFile(__dirname + "/public/donor.html")
});

app.get('/addDonor', (req, res) => {
  res.sendFile(__dirname + '/public/addDonor.html');
});

app.post('/addDonor', (req, res) => {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var mobile = req.body.mobile;
  var bloodtype = req.body.bloodtype;

  switch (bloodtype) {
    case 'AB+':
      bloodtype = 1;
      break;
    case 'AB-':
      bloodtype = 2;
      break;
    case 'A+':
      bloodtype = 3;
      break;
    case 'A-':
      bloodtype = 4;
      break;
    case 'B+':
      bloodtype = 5;
      break;
    case 'B-':
      bloodtype = 6;
      break;
    case 'O+':
      bloodtype = 7;
      break;
    default:
      bloodtype = 8
  }

  //Inserting donor in donor TABLE
  let post = {
    fname: fname,
    lname: lname,
    mobile: mobile,
    blood_id: bloodtype
  };
  let sql = 'INSERT INTO donor SET ?';
  let query = db.query(sql, post, (err, result) => {
    if (err) throw err;
    console.log(result);
  });
  // res.redirect(__dirname + '/public/donor');
});

app.get('/remDonor', (req, res) => {
  res.sendFile(__dirname + '/public/remDonor.html');
});

app.post('/remDonor', (req, res) => {
  var id = req.body.id;
  let sql = `DELETE FROM donor WHERE id = ${id}`;
  let query = db.query(sql, (err, result) => {
    if (err) throw err;
    console.log(result);
  });
});

app.get('/listDonor', (req, res) => {
  let sql = 'SELECT d.id, d.fname, d.lname, d.mobile, b.type from donor AS d INNER JOIN blood AS b ON(d.blood_id=b.id)';
  let query = db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('listDonor', {
      results,
      results
    });
    console.log(results);
  });
});

app.get('/donate', (req, res) => {
  let sql = 'SELECT * FROM hospital';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('donate', {results,results});
  });
});

app.post('/donate', (req, res) => {

  let hos = JSON.parse(req.body.hospital).split(', ');

  let sql = `SELECT id FROM hospital WHERE name = '${hos[0]}' AND city = '${hos[1]}' AND pin = '${hos[2]}'`;
  db.query(sql, (err, hosID) => {
    if (err) throw err;

    sql = `SELECT blood_id FROM donor where id = ${req.body.id}`;
    db.query(sql, (err, bloodID) => {
      if (err) throw err;
      sql = `SELECT id from stock where blood_id = ${bloodID[0].blood_id} and hospital_id =${hosID[0].id}`;
      console.log(sql);
      db.query(sql,(err,result) => {
        console.log(result);
        if(Array.isArray(result) && result.length){
          console.log("exists");
          sql = `INSERT INTO stock(id, blood_id, hospital_id) VALUES(${result[0].id},${bloodID[0].blood_id},${hosID[0].id}) ON DUPLICATE KEY UPDATE units = units+1`;
          db.query(sql, (err,result) => {
            if(err) throw err;
            console.log(result);
          });
        }
        else {
          console.log("NOT EXISTS");
          let post = {blood_id:bloodID[0].blood_id, hospital_id:hosID[0].id,units:1};
          sql = "INSERT INTO stock SET ?";
          db.query(sql, post, (err,result) => {
            if(err) throw err;
            console.log(result);
          });
        }
      });
    });
  });
});

app.get('/stock', (req, res) => {
  res.sendFile(__dirname + '/public/stock.html');
});

app.get('/viewStock', (req, res) => {
  sql = 'SELECT type,units AS Units, hospital.name FROM (blood INNER JOIN stock ON(blood.id=stock.blood_id)) INNER JOIN hospital ON (stock.hospital_id=hospital.id) GROUP BY hospital.name,blood.type';
  db.query(sql,(err,results) => {
    results.forEach((result) => {})
    res.render('viewStock', {results,results});
  });
});

app.get('/updateStock', (req,res) => {
  let sql = "SELECT * FROM hospital";
  db.query(sql, (err,results) => {
    if(err) throw err;
    res.render('updateStock',{results,results});
  });
});

app.post("/updateStock", (req, res) => {
  let hos = JSON.parse(req.body.hospital).split(', ');
  let sql = `SELECT id FROM hospital WHERE name = '${hos[0]}' AND city = '${hos[1]}' AND pin = '${hos[2]}'`;
  db.query(sql, (err, hosID) => {
    if(err) throw err;
    let bg = req.body.bloodgroup;
    sql = `SELECT id from blood where type = '${bg}'`;
    db.query(sql, (err,bloodID) => {

    })
  })
});

app.listen(3000, () => {
  console.log("Server started at port 3000");
});
