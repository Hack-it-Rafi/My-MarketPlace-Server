const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(express.json());
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://my-marketplace-3a996.web.app',
        'https://my-marketplace-3a996.firebaseapp.com',
    ],
    credentials: true,
};

app.use(cors(corsOptions));
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
const logger = async (req, res, next) => {
    console.log("IN LOGGER");
    console.log('called: ', req.host, req.originalUrl);
    next();
}

const verifyToken = async (req, res, next) => {
    console.log("In VERIFYTOKEN");
    //     // console.log(req.cookies);
    const token = req.cookies?.token;
    console.log("Value of token in middleware: ", token);
    if (!token) {
        return res.status(401).send({ message: "not authorized" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'not authorized' })
        }
        console.log("Value in the token: ", decoded);
        req.user = decoded;
        next();
    })

}

async function run() {
    try {
        // await client.connect();        
        const database = client.db("MarketPlaceDB");
        const JobsCollection = database.collection("Jobs");
        const BidsCollection = database.collection("Bids");

        // JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV==='production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('Logging out: ', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

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
        app.get("/myJobs", logger, verifyToken, async (req, res) => {
            const myEmail = req.query.email;
            const query = { employer_email: myEmail };
            console.log("Tok Token: ", req.cookies.token);
            console.log(myEmail, req.user.email);
            if (myEmail !== req.user.email) {
                return res.status(403).send({ message: "Forbidden Access" })
            }
            const options = {
                sort: { job_title: 1 },
            };
            const cursor = JobsCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })
        // UPDATE myJobs
        app.get("/myJobs/:id", logger, verifyToken, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await JobsCollection.findOne(query);
            res.send(result);
        })
        app.patch("/myJobs/:id", logger, verifyToken, async (req, res) => {
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
        app.delete('/myJobs/:id', logger, verifyToken, async (req, res) => {
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


        app.post('/jobs', logger, verifyToken, async (req, res) => {
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

        app.post('/bids', logger, verifyToken, async (req, res) => {
            const newProduct = req.body;
            console.log(newProduct);
            const result = await BidsCollection.insertOne(newProduct);
            res.send(result);
        })
        app.get('/bids', logger, verifyToken, async (req, res) => {
            const cursor = BidsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        // app.get("/myBids", logger, verifyToken, async (req, res) => {
        //     const bidderMail = req.query.email;
        //     // console.log(jobCat);
        //     const query = { bidderEmail: bidderMail };
        //     const options = {
        //         sort: { status: 1 },
        //     };
        //     const cursor = BidsCollection.find(query, options);
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })
        app.get("/myBids", logger, verifyToken, async (req, res) => {
            const bidderMail = req.query.email;
            const query = { bidderEmail: bidderMail };

            const cursor = BidsCollection.find(query);
            const results = await cursor.toArray();

            // Define a custom sort order function
            const customSort = (a, b) => {
                const statusOrder = { pending: 1, "In Progress": 2, Rejected: 3, Complete: 4 };
                return statusOrder[a.status] - statusOrder[b.status];
            };

            // Sort the results using the custom sort order function
            results.sort(customSort);

            res.send(results);
        });



        app.patch("/myBids/:id", logger, verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body;
            console.log(updatedStatus.status, id, "Rafi here");
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const stat = {
                $set: {
                    status: updatedStatus.status
                }
            }

            const result = await BidsCollection.updateOne(filter, stat, options);
            res.send(result);
        })


        app.get("/bidRequests", logger, verifyToken, async (req, res) => {
            const ownerEmail = req.query.email;
            // console.log(jobCat);
            const query = { ownerEmail: ownerEmail };
            const options = {
                sort: { job_title: 1 },
            };
            const cursor = BidsCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })
        // Bids Update
        app.get("/bidRequests/:id", logger, verifyToken, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await BidsCollection.findOne(query);
            res.send(result);
        })
        app.patch("/bidRequests/:id", logger, verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedStatus = req.body;
            console.log(updatedStatus.status, id, "Rafi here");
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const stat = {
                $set: {
                    status: updatedStatus.status
                }
            }

            const result = await BidsCollection.updateOne(filter, stat, options);
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