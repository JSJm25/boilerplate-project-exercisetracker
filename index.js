const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient, ObjectId } = require('mongodb');
const client = new MongoClient(process.env.MONGOURI);
const db = client.db('exerciseTracker');
const users = db.collection('users');
const mongoose = require('mongoose');

const { Schema } = mongoose;

mongoose.connect(`${process.env.MONGOURI}exerciseTracker?retryWrites=true&w=majority&appName=ETDB`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log(' Mongoose Connected to MongoDB');
}).catch((err) => {
  console.error('Mongoose Failed to connect to MongoDB', err);
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
    log: []
  }
)
const user = mongoose.model('users', userSchema);

const registerUser = app.post('/api/users', async (req, res) => {
  const {username} = req.body;
  try {
    let newUser = new user({
      username,
      log: []
    });
    let result = await users.insertOne(newUser);

    let responseObject = {
      username: newUser.username,
      _id: newUser._id
    }
    res.send(responseObject);
  } catch (err) {
    res.json({err});
    console.error('\n' + err + '\n \n');
  }
});

const getUsers = app.get('/api/users/:_id?', async (req, res) => {
  try {
    if(!req.params._id){
      const getUsers = await users.find({});
      const userArray = await getUsers.toArray();
      const formatResponse = await userArray.map((obj) => {
        const { log, ...rest} = obj;
        return rest;
      })
      res.send(formatResponse);
    } else {
      const id = new ObjectId(req.params._id)
      const u = await users.findOne({ _id: id });
      const uName = u.username;
      const uID = u._id;
      const responseObject = {
        username: uName,
        _id: uID,
      }
      res.send(responseObject);
    }
  } catch (error) {
    console.log(error);
    res.json({error})
  }
})

const createExerciseEntry = app.post('/api/users/:_id/exercises', async (req, res) => {
  let { description, duration, date } = req.body;
  const id = new ObjectId(req.params._id);
  if(!date) date = new Date();
  try {

    const log = {
      description,
      duration,
      date
     };
    const u = await users.findOne({_id: id});
    const uName = u.username;
    const uID = u._id;
    
    const result = await users.findOneAndUpdate(
      { _id: id },
      {$push: { log }},
      {returnDocument: "after"}
    )

    let responseObject = {
      username: uName,
      description,
      duration: parseFloat(duration),
      date: new Date(date).toDateString(),
      _id: uID
    }
    console.log(responseObject);
    res.send(responseObject);
  } catch (error) {
    console.error(error);
    res.send({"error": `${error}`});
  }
})

const getLog = app.get('/api/users/:_id/logs/', async (req, res) => {
  const id = new ObjectId(req.params._id);
  const {from, to, limit } = req.query;
  try{
    const user = await users.findOne({_id: id});
    let uName = user.username;
    let uID = user._id;
    let uLog = user.log.sort((a, b) => {
      new Date(a.date) - new Date(b.date);
    });
    if(from) uLog = uLog.filter(obj => new Date(obj.date) >= new Date(from));
    if(to) uLog = uLog.filter(obj => new Date(obj.date) <= new Date(to));
    if(limit) uLog = uLog.slice(0, limit);
    uLog = uLog.map((obj) => {
      obj.date = new Date(obj.date).toDateString();
      obj.duration = parseFloat(obj.duration);
      return obj;
    });
    const entryCount = uLog.length;
    
    const responseObject = {
      username: uName,
      count: entryCount,
      _id: uID,
      log: uLog
    }
    res.send(responseObject);
  } catch (err) {
    console.error(err)
    res.send({"error": `${err}`});
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port + '\n http://localhost:3000/');
});
