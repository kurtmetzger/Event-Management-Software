const express = require('express');
const { connectToDb, getDb } = require('./db');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = 3000;
let viewsPath = path.join(__dirname, 'views');

// Points to database on local machine
const connectionStr = "mongodb+srv://swdv650:swdv650@cluster0.2s0c6aw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Middleware
app.use(express.urlencoded({ extended: true }));

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
async function connectToDatabase() {
    try {
        await mongoose.connect(connectionStr, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToDatabase();

// Schema for job positions
const jobSchema = new mongoose.Schema({
    job_title: String,
    job_description: String,
    assigned_staff_member: String
});

// Schema for events
const eventSchema = new mongoose.Schema({
    event_name: String,
    event_start_date: Date,
    event_end_date: Date,
    event_start_time: String,
    event_end_time: String,
    event_location: String,
    event_organization_name: String,
    job_positions: [jobSchema]
});


const Event = mongoose.model('Event', eventSchema);
const EventJob = mongoose.model('EventJob', jobSchema);

// Gets the various pages from the views folder
app.get('/', async (req, res) => {
    try {
        const events = await Event.find({});
        res.render('index', { eventsList: events });
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

// Handles post request from form to create a new event
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

    try {
        await newEvent.save();
        console.log('New Event created successfully!');
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error saving item: ' + err);
    }
});

// Delete event route
app.post('/delete/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        await Event.findByIdAndDelete(eventId);
        console.log(`Event with ID ${eventId} deleted successfully!`);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting event');
    }
});

app.post('/edit/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const updatedEvent = {
            event_name: req.body.event_name,
            event_start_date: req.body.event_start_date,
            event_end_date: req.body.event_end_date,
            event_start_time: req.body.event_start_time,
            event_end_time: req.body.event_end_time,
            event_location: req.body.event_location,
            event_organization_name: req.body.organization_name
        };
        
        await Event.findByIdAndUpdate(eventId, updatedEvent);
        console.log(`Event with ID ${eventId} updated successfully!`);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating event');
    }
});

/*
app.post('/create_job/:id', async (req, res) => {
    try{
        const eventID = req.params.id;
        const newJob = new EventJob({
            job_title: req.body.job_title,
            job_description: req.body.job_description,
            assigned_staff_member: req.body.assigned_staff_member
        })

        await newJob.save();

        await Event.findByIdAndUpdate(
            eventID,
            { $push: { job_positions: newJob } },
        );

        console.log('Job added to database successfully:', newJob);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating new job')
    }
})
*/

app.post('/create_job/:id', async (req, res) => {
    const { job_title, job_description, assigned_staff_member } = req.body;
    const eventID = req.params.id;

    // Validate input fields
    if (!job_title || !job_description || !assigned_staff_member) {
        // Render the job positions page again with an error message
        const event = await Event.findById(eventID);
        return res.render('job_positions', { 
            job_positions: event.job_positions, 
            event, 
            errorMessage: 'All fields are required to create a job position.' 
        });
    }

    try {
        const newJob = new EventJob({
            job_title,
            job_description,
            assigned_staff_member
        });

        await newJob.save();

        await Event.findByIdAndUpdate(
            eventID,
            { $push: { job_positions: newJob } },
        );

        console.log('Job added to database successfully:', newJob);
        // Stay on the job positions page after job creation
        const updatedEvent = await Event.findById(eventID);
        res.render('job_positions', { job_positions: updatedEvent.job_positions, event: updatedEvent });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating new job');
    }
});


app.get('/edit/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId);
        res.render('edit_event', { event });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading event for editing');
    }
});

app.get('/job_positions/:id', async (req, res) => {
    try{
        const eventID = req.params.id;
        const event = await Event.findById(eventID);
        const job_positions = event.job_positions
        res.render('job_positions', {job_positions: job_positions, event: event});
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading job positions')
    }
});

app.post('/delete_job/:eventId/:jobId', async (req, res) => {
    try {
        const { eventId, jobId } = req.params;
        await Event.findByIdAndUpdate(eventId, {
            $pull: { job_positions: { _id: jobId } }
        });
        console.log(`Job with ID ${jobId} deleted successfully!`);
        res.redirect(`/job_positions/${eventId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting job');
    }
});

app.post('/create', (req, res) => {
    let { event_start_date, event_end_date } = req.body;
    
    // Ensure dates are parsed correctly
    event_start_date = new Date(event_start_date);
    event_end_date = new Date(event_end_date);

    // Save event with correct date format
    Event.create({
        ...req.body, 
        event_start_date: event_start_date,
        event_end_date: event_end_date
    }, (err, newEvent) => {
        if (err) {
            console.log(err);
            res.redirect('/create_event');
        } else {
            res.redirect('/');
        }
    });
});


// Prints out when server is running
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
