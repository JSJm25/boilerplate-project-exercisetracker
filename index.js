const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGOURI);
const db = client.db('exerciseTracker');
const users = db.collection('users');
const exercises = db.collection('exercises');
const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(`${process.env.MONGOURI}exerciseTracker?retryWrites=true&w=majority&appName=ETDB`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

app.use((req, res, next) => {
  let date = new Date();
  console.log(`${req.method}, ${req.path} - ${req.ip}  at ${date.toUTCString()}`);
  next();
}); //Log Requests

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
}); //serve html file

const userSchema = new Schema(
  {
    username: String,
  }
)
const user = mongoose.model('users', userSchema);

const exerciseSchema = new Schema(
  {
    user_id: {
      type: String,
      required: true
    },
    description: String,
    duration: Number,
    date: Date
  }
)
const exercise = mongoose.model('exercises', exerciseSchema);

app.post('/api/users', async (req, res) => {
  const {username} = req.body;
  try {
    await client.connect();
    const newUser = new user({
      username
    });
    const result = await users.insertOne(newUser);
    res.json(newUser);
  } catch (err) {
    res.json({err});
    console.error('\n' + err + '\n \n');
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {

  const { _id, description, duration, date} = req.body;
  const u = await users.findOne({_id});
  if(!date) date = new Date();

  try {
    const nE = new exercise({
      user_id: _id,
      description,
      duration,
      date
    });
    const result = await exercises.insertOne(nE);
    
    const jsonResponse = {
      username: u.username,
      description,
      duration,
      date,
      _id
    };
    res.json(jsonResponse);
  } catch (error) {
    res.json(error);
  }
});

app.get('/api/users/:_id?', async (req, res) => {
  try {

    await client.connect();

    if (!req.params._id) {

      const u = users.find({});
      const userList = await u.toArray()
      res.send(userList);

    } else {
      const {uid} = req.params._id;
      const user = await users.findOne({uid});
      res.json({ user });
    }

  } catch (err) {
    res.json({ error: "Check Terminal" });
    console.error(`\n ${err} \n`);
  }
});



app.post('/api/users/:_id/exercises', async (req, res) => {

  let { _id, description, duration, date} = req.body;

})

app.get('/api/users/:_id/logs/', async (req, res) => {

})

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port + '\n http://localhost:3000/');
});
