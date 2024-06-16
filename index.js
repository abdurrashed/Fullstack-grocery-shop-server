const express=require('express');

const app=express();
const cors=require('cors');

require('dotenv').config()
const port=process.env.PORT||5000;


//midlleware;

app.use(cors());
app.use(express.json());
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SslCommerzPayment = require('sslcommerz-lts/api/payment-controller');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2nz0wlu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const store_id = process.env.store_id;
const store_passwd = process.env.store_passwd;
const is_live = false //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const database = client.db("Groceryshop");
    const itemscollection = database.collection("items");
    const  cartCollection = database.collection("cart");

    const usercollection=database.collection("users");
    const ordercollection=database.collection("order");


    //jwt relted api
    app.post('/jwt',async(req,res)=>{
      const user=req.body;

const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
res.send({token});
  
   


    })

    

    //middlewares

    const verifyToken=(req,res,next)=>{
       console.log('inside verify token',req.headers);
       if(!req.headers.authorization){
        return res.status(401).send({message:'forbidden access'})
       }
        const token=req.headers.authorization.split(' ')[1];

        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
            return res.status(401).send({message:'forbidden access'})

          }
          req.decoded=decoded;
          next();



    })
        
       }
       //next()


       app.get('/users/admin/:email',verifyToken,async(req,res)=>{
          const email=req.params.email;

          if(email!==req.decoded.email){

            return res.status(403).send({message:'unauthorized access'})
          }

          const query={email:email};
          const user=await usercollection.findOne(query);
          let admin=false;
          if(user){

            admin = user?.role==='admin';

          }
          res.send({admin});


       }
      )



  


 
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email} ;
      const user=await usercollection.findOne(query);
      const isAdmin=user?.role==='admin';

      if(!isAdmin){
        return res.status(403).send({message:'forbidden access'})

      }
      next()






    }
    


    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      
      
      const result=await usercollection.find().toArray()
      res.send(result);

    });

    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
     const id=req.params.id;
     const filter={_id:new ObjectId(id)};
     const updateDoc={
       $set:{
        role:'admin'
      

       }

     }
     const result=await usercollection.updateOne(filter,updateDoc)

     res.send(result);



    })

    app.patch('/items/:id',async(req,res)=>{
      const item=req.body;
      const id=req.params.id;
      const filter={_id:new ObjectId(id)}
      const updateDoc={
        $set:{
          name:item.name,
          category:item.category,
          price:item.price,
          weight:item.weight,
          image:item.image,


        }

      }


      const result= await itemscollection.updateOne(filter,updateDoc)

      res.send(result);


    })

    app.post('/users',async(req,res)=>{

      const user=req.body;

      const query={email:user.email}
      const existingUser=await usercollection.findOne(query)
      if(existingUser){

        return res.send(user)
      }
     


      const result=await usercollection.insertOne(user);
      res.send(result);

    })


    app.get('/items/:id',async(req,res)=>{
     const id=req.params.id;
     const query={ _id:new ObjectId(id)}

     const result= await itemscollection.findOne(query);
     res.send(result);

    })


    app.get('/items',async(req,res)=>{


     const result=await itemscollection.find().toArray()

     res.send(result);

    })

    app.post('/items',verifyToken,verifyAdmin,async(req,res)=>{
      const item=req.body;
      const result= await itemscollection.insertOne(item);

      res.send(result);

    })

    app.delete('/items/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await itemscollection.deleteOne(query);
      res.send(result);
    })
   

    app.get('/carts',async(req,res)=>{
      const email=req.query.email;
      const query={email:email};
      const result=await cartCollection.find(query).toArray()

     res.send(result);

    })

    app.post('/carts',async(req,res)=>{


     const cartItem=req.body;

     const result=await cartCollection.insertOne(cartItem)

     res.send(result);




    }) 

    app.delete('/carts/:id',async(req ,res)=>{

    const id=req.params.id;
    const query={_id:new ObjectId(id)}
    const result=await cartCollection.deleteOne(query);
    res.send(result);

    })

    app.delete('/users/:id',verifyToken,verifyAdmin,async(req ,res)=>{

      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await usercollection.deleteOne(query);
      res.send(result);
  
      })

     


      app.post('/pay', async (req, res) => {
        const order = req.body;
        const tran_id = new ObjectId().toString();
    
        // Convert order price to an integer
        const total_amount = parseFloat(order.Price); // Assuming Price is directly in the root object
    
        const data = {
            total_amount: total_amount,
            currency: 'BDT',
            tran_id: tran_id, // Use unique tran_id for each API call
            success_url: `http://localhost:5000/payment/success/${tran_id}`,
            fail_url: `http://localhost:5000/payment/fail/${tran_id}`,
            cancel_url: 'http://localhost:3030/cancel',
            ipn_url: 'http://localhost:3030/ipn',
            shipping_method: 'Courier',
            product_name: 'Computer',
            product_category: 'Electronic',
            product_profile: 'general',
            cus_name: order.Name, // Assuming Name is directly in the root object
            cus_email: order.email || 'customer@example.com', // Assuming Email is directly in the root object
            cus_add1: order.Address, // Assuming Address is directly in the root object
            cus_country: 'Bangladesh',
            cus_phone: '01711111111',
            cus_fax: '01711111111',
            ship_name: 'Dhaka',
            ship_add1: 'Dhaka',
            ship_add2: 'Dhaka',
            ship_city: 'Dhaka',
            ship_state: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };
    
        console.log(data);
    
        const sslcz = new SslCommerzPayment(store_id, store_passwd, is_live);
    
        try {
            const apiResponse = await sslcz.init(data);
    
            if (apiResponse.GatewayPageURL) {
                const GatewayPageURL = apiResponse.GatewayPageURL;
                res.json({ url: GatewayPageURL });
                console.log('Redirecting to:', GatewayPageURL);
            } else {
                res.status(400).json({ error: 'Failed to retrieve GatewayPageURL', details: apiResponse });
                console.error('Failed to retrieve GatewayPageURL', apiResponse);
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
            console.error('Error during payment initialization:', error);
        }
    
        const finalorder = {
            ...order, // Include all order details
            tranjectionId: tran_id, 
            date: order.date,
            cartId: order.cartId,
            menuId: order.menuId,
        };
    
      
            const result = await ordercollection.insertOne(finalorder);
            console.log('Order saved successfully:', result);
      

        const query={_id:{
          $in:finalorder.cartId.map(id => new ObjectId(id))
        }}


        const deleteResult= await cartCollection.deleteMany(query);

       

         
    });

    app.post('/payment/fail/:tranId',async(req,res)=>{
      const result= await ordercollection.deleteOne({tranjectionId:req.params.tranId});
      if(result.deletedCount){

        res.redirect(`https://grocey-project.web.app/dashboard/payment/fail/${req.params.tranId}`)
      }




    })

    app.post('/payment/success/:tranId',async(req,res)=>{
      console.log(req.params.tranId)

      const result= await ordercollection.updateOne({tranjectionId:req.params.tranId},{

         $set:{
           paidStatus: 'success',

         },
      
      })

      if(result.modifiedCount>0){
        res.redirect(`https://grocey-project.web.app/dashboard/payment/success/${req.params.tranId}`)

     }
     


    })


    app.get('/order/:email',verifyToken, async (req, res) => {
      try {
          console.log('req.decoded:', req.decoded); // Log the decoded token
          console.log('req.params.email:', req.params.email); // Log the requested email
  
          if (!req.decoded || !req.decoded.email) {
              return res.status(403).send({ message: 'Forbidden access: Invalid token' });
          }
  
          if (req.params.email !== req.decoded.email) {
              return res.status(403).send({ message: 'Forbidden access: Email mismatch' });
          }
  
          const query = { email: req.params.email };
          const result = await ordercollection.find(query).toArray();
          res.send(result);
      } catch (error) {
          console.error('Error fetching orders:', error);
          res.status(500).send({ message: 'Internal server error' });
      }
  });
  

  //stats or analytics

  app.get('/admin-stats',async(req,res)=>{
    const users= await usercollection.estimatedDocumentCount();
   

    const items= await itemscollection.estimatedDocumentCount();

    const orders= await ordercollection.estimatedDocumentCount();

    const payments= await ordercollection.find().toArray();

    const revenue=payments.reduce((total,payment)=>total+payment.Price,0)




    res.send({users,items,orders,revenue})

    



  }
)


// using aggregate pipleline
const { ObjectId } = require('mongodb');

app.get('/order-stats', verifyToken,verifyAdmin,async (req, res) => {
    try {
        const result = await ordercollection.aggregate([
            {
                $unwind: '$menuId'
            },
            {
                $addFields: {
                    menuIdObject: { $toObjectId: '$menuId' }
                }
            },
            {
                $lookup: {
                    from: 'items',
                    localField: 'menuIdObject',
                    foreignField: '_id',
                    as: 'menuItems'
                }
            },
            {
              $unwind: '$menuItems'
          },
          {
            $group:{

              _id:'$menuItems.category',
              quantity:{
                $sum:1
              },
              revenue:{$sum:'$menuItems.price'}
            }


          },
          {
            $project:{
              _id:0,
            category:'$_id',
            quantity:'$quantity',
            revenue:'$revenue',

            }



          }

        ]).toArray();

        res.send(result);
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});










    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{

    res.send('gorcery is sitting ');

})


app.listen(port,()=>{

console.log(`grocey shops server running ${port}`)

})






