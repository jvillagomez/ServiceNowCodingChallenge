'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors')


var faunadb = require('faunadb'),
    q = faunadb.query;

var servicenowClient = new faunadb.Client({ secret: process.env.FAUNADB_SERVER_KEY });




app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: true}));

const router = express.Router();


// const getIncidents = require('../controllers/getIncidents');
// const getIncidentByNumber = require('../controllers/getIncidentByNumber');

// Test endpoint, to verify working state.
router.get('/test', (req, res) => {
    return res.send('Hello, from the ServiceNow Future Products Team!');
});

// Return single incident by 'Number'
router.get('/incidentByNumber', (req, res) => {
    const queryParams = req.query;

    if (!Object.keys(queryParams).length) {
        return res.send({});
    }
    const incidentNumberParam = queryParams.number;
    if (!incidentNumberParam) {
        return res.send({});
    }

    servicenowClient.query(
        q.Get(
            q.Match(
                q.Index('incidentByNumber'), incidentNumberParam
            )
        )
    )
    .then(incident => {
        return res.send(incident.data);
    })
    .catch(err => {
        return res.send(err);
    });
});

// Return all incidents
router.get('/incidents', (req, res) => {
    servicenowClient.query(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index('allIncidents')
                )
            ),
            q.Lambda(['ref'], q.Get(q.Var('ref')))
        )
    )
    .then(incidents => {
        let incidentData = [];
        for (const incident of incidents.data) {
            incidentData.push(incident.data);
        }
        return res.send(incidentData);
    })
    .catch(err => {
        return res.send(err);
    });
});

// Return all incidents, that match a given 'state'
router.get('/incidentsByState', (req, res) => {
    let state = req.query.state;
    if (!state) {
        return res.send([]);
    }
    servicenowClient.query(
        q.Map(
            q.Paginate(
                q.Match(
                    q.Index('incidentsByState'), state
                )
            ),
            q.Lambda(['ref'], q.Get(q.Var('ref')))
        )
    )
    .then(incidents => {
        let incidentData = [];
        for (const incident of incidents.data) {
            incidentData.push(incident.data);
        }
        return res.send(incidentData);
    })
    .catch(err => {
        return res.send(err);
    });
});

// Return single incident, by ID.
router.post('/insertIncident', (req, res) => {
    console.log('req', req);
    let newIncident = req.body;
    console.log('newIncident', newIncident);
    if (!Object.keys(newIncident).length) {
        return res.send('No data provided for insertion');
    }
    const requiredIncidentFields = ['number', 'state', 'short_description'];
    for (const field of requiredIncidentFields) {
        if (!newIncident[field]) {
            return res.send("Query did not contain a " +  field + " value");
        }
    }
    servicenowClient.query(
        q.Create(
            q.Collection('Incident'), {
                data: newIncident
            }
        )
    )
    .then(result => {
        return res.send(result);
    })
    .catch(error => {
        return res.send(error);
    });
});



router.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<h1>Goodluck from the ServiceNow KickStart team!</h1>');
    res.end();
});
router.get('/another', (req, res) => res.json({ route: req.originalUrl }));
router.post('/', (req, res) => res.json({ postBody: req.body }));

app.use(cors());
app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
