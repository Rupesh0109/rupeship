const express = require('express');
const app = express();
const path=require("path");
const QRCode = require('qrcode');
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,'/views'));
app.use('/assets',express.static(__dirname+'/public'));


const session=require("express-session");
const MongoDBSession=require("connect-mongodb-session")(session)
const MONGOURI="mongodb+srv://rupesh:rupesh123@laundry.xk6qtjt.mongodb.net/?retryWrites=true&w=majority";
const colors=require("colors");
const mongoose=require("mongoose");

const UserModel=require("./models/User")

const connectDB = async () => {
   try {
     const conn = await mongoose.connect(MONGOURI,{useNewUrlParser:true,
     useUnifiedTopology:true,
     });
     console.log(
       `Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white
     );
   } catch (error) {
     console.log(`Error in Mongodb ${error}`.bgRed.white);
   }
 };
 connectDB();


 const store=new MongoDBSession({
   uri:MONGOURI,
   databaseName:"Laundry-website",
   collection:"sessions"
 })

app.use(session({
   secret:"key that signs the cookie",
   resave:false,
   saveUninitialized:false,
   store:store,
}))

//middleware
const isAuth=async(req,res,next)=>{
   if(req.session.isAuth){
    await next()
   }
   else{
      res.redirect("/login?error=notlogin")  
   }
}
const isAdmin=async(req,res,next)=>{
   if(req.session.isAdmin){
     await next()
   }
   else{
      res.redirect("/?error=notadmin")
   }
}
const generateQR = async text => {
   try {
     return await QRCode.toDataURL(text)
   } catch (err) {
     console.error(err+"qrcode")
   }
 }
//end of middleware


//routes
app.get('/', function(req, res) {
   var logout=false;
   var admincheck=false;
   if(req.query.logout==="sucessfull"){
      logout=true
   }
   if(req.query.error==="notadmin"){
      admincheck=true
   }
   res.render('pages/home',{auth:req.session.isAuth,logout:logout,data:req.session.data,admin:req.session.isAdmin,admincheck:admincheck});
});
app.get('/login', async(req, res)=> {
   if(await req.session.isAuth){
     await res.redirect("/dashboard?error=logged");

   }
   else{
   var password=false;
   var register=false;
   var modal=false;
   var login=false;
   if(req.query.error==="userexists"){
      modal=true;
   }
   if(req.query.error==="notlogin"){
      login=true;
   }
   if(req.query.error==="passworddoesnotmatch"){
      password=true;
   }
   if(req.query.register==="success"){
      register=true;
   }
   res.render('pages/login',{condition:modal,success:register,password1:password,login:login,auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin});
   }
});
app.get('/register', function(req, res) {
   if(req.session.isAuth){
      res.redirect("/dashboard?error=logged");
   }
   else{
   var exists=false;
   if(req.query.error==="usernotexists"){
      exists=true;
   }
   res.render('pages/register',{modal:exists,auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin});
   }
});

app.get('/dashboard',isAuth,async(req,res)=>{
   var logged=false;
   if(await req.query.error==="logged"){
      logged=true;
   }
   res.render("pages/dashboard",{auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin,logged:logged});
});

app.get('/admin/dashboard',isAuth,isAdmin,function(req,res){
   res.render("pages/admindashboard",{auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin})
})
app.get('/admin/orderintake',isAuth,isAdmin,function(req,res){
   res.render("pages/orderintake",{auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin})
})
app.get('/admin/orderdelivery',isAuth,isAdmin,function(req,res){
   res.render("pages/orderdelivery",{auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin})
})
app.get('/admin/checkuser',isAuth,isAdmin,function(req,res){
   res.render("pages/checkuser",{auth:req.session.isAuth,data:req.session.data,admin:req.session.isAdmin})
})
//end of routes

//form handling
app.post("/register",async(req,res)=>{
   const {name,roll,password}=req.body;
   
   let user =await UserModel.findOne({"rollno":roll});
   if(user){
      return res.redirect("/login?error=userexists")
   }
   var qrsrc=await generateQR(roll);
   
    user= new UserModel({
      name:name.toUpperCase(),
      rollno:roll,
      password:password,
      qrsrc:qrsrc
   });
   

   user.save();
   res.redirect("/login?register=success");
  
   
   
})

app.post('/login',async(req,res)=>{
   try{
   const {roll,password}=req.body;
   let check= await UserModel.findOne({"rollno":roll});
   if(!check){
     return res.redirect("/register?error=usernotexists")
   }
   if(password!==check.password){
      res.redirect("/login?error=passworddoesnotmatch")
   }
   req.session.data=check;
   if(req.session.data.role==="admin"){
      req.session.isAuth=true;
      req.session.isAdmin=true
      return res.redirect("/admin/dashboard")
   }
   
   req.session.isAuth=true;

   res.redirect("/dashboard")
}
catch(error){
   console.log(error.message+"login")
}
  
})



app.post("/orderintake" ,isAdmin,async(req,res)=>{
const{rollno}=req.body;
console.log(rollno)
const user =await UserModel.findOne({"rollno":rollno})
if(!user){
   return res.send("USER NOT FOUND")
}
const d = new Date();
let day = d.getDay();
// let day=1
var k=new Date();
k.setHours(0,0,0,0);
k=k.getTime()


if(user.orders.length==0){
console.log("if")
user.orders.push({
day:day,
time:k,
state:"Processing"
})
user.save();
return res.send(`Order intake success for ${rollno}`)
}
// else if

else if(user.orders[user.orders.length-1].state=="Delivered"){
   let days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
   if(user.orders[user.orders.length-1].day==day){
      if(k-user.orders[user.orders.length-1].time<(24*7*60*60*1000)){
         return res.send(`Order cannot be created previous order created on ${days[user.orders[user.orders.length-1].day]}`)  
      }
      console.log("else if")
      user.orders.push({
         day:day,
         state:"Processing",
         time:k
         })
         user.save();
         return res.send(`Order intake success for ${rollno}`)
   }
   else{
      return res.send(`Order cannot be created previous order created on ${days[user.orders[user.orders.length-1].day]}`)

   }
}
else{
   return res.send("Already previous order is in processing")
}
 

})

app.post("/orderdelivery",isAdmin,async(req,res)=>{
   const{rollno}=req.body;
   const db=await UserModel.findOne({"rollno":rollno})
   if(!db){
     return res.send("USER NOT FOUND")
   }
   if(db.orders.length==0){
      return res.send("there is no orders in this account")
   }
   if(db.orders[db.orders.length-1].state=="Delivered"){
      return res.send("there are no active orders ,all the previous orders are delivered")
   }
   db.orders[db.orders.length-1].state="Delivered"
   db.save();
  
   
   return res.send(`STATUS UPDATED AS DELIVERED FOR ${rollno}`);

})
app.post("/checkuser",isAdmin,async(req,res)=>{
   const{rollno}=req.body;
   if(rollno==""){
      return res.send("EMPTY!!!!")
   }
   const data=await UserModel.findOne({"rollno":rollno})
   if(!data){
      return res.send("USER NOT EXIST")
   }
  
   return res.send(`<table class="table" id="data">
   <tbody>
      <tr>
       <th scope="row">Name</th>
       <td>${data.name} </td>
     </tr>
     <tr>
       <th scope="row">Roll no</th>
       <td>${data.rollno}</td>
     </tr> 
     <tr>
       <th scope="row">Unique Qr Code</th>
       <td><img class="img-fluid" src="${data.qrsrc}" alt="QRCODE"><br></td>
     </tr> 
     <tr>
     <th scope="row">PHOTO</th>
     <td style="height:150px;width:150px"> <img class="img-fluid" src="https://www.rajalakshmi.org/QRCode/img/${data.rollno}.jpg" alt="IDCARDPhoto"><br></div></td>
     <br></td>
   </tr> 
   </tbody>
 </table>`)
 })
//end of form handling

//logout
app.get("/logout",function(req,res){
req.session.destroy((err)=>{
   if(err) throw err;
   res.redirect("/?logout=sucessfull");
})
});
app.listen(3000);
console.log('Server is listening on port 3000');
