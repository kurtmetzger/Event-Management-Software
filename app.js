const express = require('express');
const { connectToDb, getDb} = require('./db');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const path = require('path');
const { MongoClient } = require('mongodb');

app.set('view engine', 'ejs');
app.use(express.static("public"));

const PORT = 3000;
let viewsPath = path.join(__dirname, 'views');

//Points to database on local machine
const connectionStr = "mongodb://localhost:27017/EventDatabase"; 

//Middleware
app.use(express.urlencoded({ extended: true }));

async function connectToDatabase() {
    try {
        await mongoose.connect(connectionStr, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB!");
        
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToDatabase();


//Schema for job positions
const jobSchema = new mongoose.Schema({
    job_title: String,
    job_description: String,
    taken: Boolean,
    assigned_staff_member: String
})


//Schema for events
const eventSchema = new mongoose.Schema({
    event_name: String,
    event_start_date: String,
    event_end_date: String,
    event_start_time: String,
    event_end_time: String,
    event_location: String,
    event_organization_name: String,
    job_positions: [jobSchema]
})

const Event = mongoose.model('Event', eventSchema)


//Gets the various pages from the views folder
app.get('/', async (req, res) => {
    try {
        const events = await Event.find({});
        res.render('index', {
            eventsList: events
        });
        console.log(events);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/create_event', async (req, res) => {
    try {
        res.render('create_event');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/create', async (req, res) => {
    const newEvent = new Event({
        event_name: req.body.event_name,
        event_start_date: req.body.event_start_date,
        event_end_date: req.body.event_end_date,
        event_start_time: req.body.event_start_time,
        event_end_time: req.body.event_end_time,
        event_location: req.body.event_location,
        event_organization_name: req.body.organization_name,
        job_positions: []
    });

    try{
        await newEvent.save();
        res.send('Event successfully added!');
    } catch (err){
        res.status(500).send('Error saving item: ' + err);
    }
});



//Prints out when server is running
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

