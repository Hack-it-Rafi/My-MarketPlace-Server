const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5174'],
    credentials: true
}));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("MarketPlace server is running");

})
console.log(process.env.DB_USER, process.env.DB_PASS);
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xyjw3s8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// my middleware
const logger = async(req, res, next)=>{
    console.log("IN LOGGER");
    console.log('called: ', req.host, req.originalUrl);
    next();
}

async function run() {
    try {
        // await client.connect();        
        const database = client.db("MarketPlaceDB");
        const JobsCollection = database.collection("Jobs");
        const BidsCollection = database.collection("Bids");

        // JOBS
        app.get("/categoryJobs", async (req, res) => {
            const jobCat = req.query.category;
            // console.log(jobCat);
            const query = { category: jobCat };
            const options = {
                sort: { job_title: 1 },
            };
            const cursor = JobsCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get("/myJobs", async (req, res) => {
            const myEmail = req.query.email;
            const query = { employer_email: myEmail };
            const options = {
                sort: { job_title: 1 },
            };
            const cursor = JobsCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })
        // UPDATE myJobs
        app.get("/myJobs/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await JobsCollection.findOne(query);
            res.send(result);
        })
        app.patch("/myJobs/:id", async (req, res) => {
            const id = req.params.id;
            const updatedJobs = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const job = {
                //{name, image, brand, type, price, rating, description}
                $set: {
                    // {email, title, deadline, category, minprice, maxprice, shortDes, longDes}
                    employer_email: updatedJobs.email,
                    job_title: updatedJobs.title,
                    category: updatedJobs.category,
                    deadline: updatedJobs.deadline,
                    minimum_price: updatedJobs.minprice,
                    maximum_price: updatedJobs.maxprice,
                    short_description: updatedJobs.shortDes,
                    long_description: updatedJobs.longDes,
                }
            }

            const result = await JobsCollection.updateOne(filter, job, options);
            res.send(result);
        })

        // DELETE 
        app.delete('/myJobs/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await JobsCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await JobsCollection.findOne(query);
            res.send(result);
        })


        app.post('/jobs', async (req, res) => {
            const newProduct = req.body;
            console.log(newProduct);
            const result = await JobsCollection.insertOne(newProduct);
            res.send(result);
        })
        app.get('/jobs', async (req, res) => {
            const cursor = JobsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // BIDS

        app.post('/bids', async (req, res) => {
            const newProduct = req.body;
            console.log(newProduct);
            const result = await BidsCollection.insertOne(newProduct);
            res.send(result);
        })
        app.get('/bids', async (req, res) => {
            const cursor = BidsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })
        app.get("/myBids", async (req, res) => {
            const bidderMail = req.query.email;
            // console.log(jobCat);
            const query = { bidderEmail: bidderMail };
            const options = {
                sort: { job_title: 1 },
            };
            const cursor = BidsCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Market server is running on server ${port}`);
})