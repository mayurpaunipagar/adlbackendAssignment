const express=require('express');
const session=require('express-session');
const secret="test2";
const mongoose=require('mongoose');
mongoose.connect("mongodb://localhost:27017/users",{useNewUrlParser: true, useUnifiedTopology: true})
.then(()=>{
    console.log("connected to DB...");
})
.catch((e)=>{
    console.error("DB Error", e);
})

const userSchemaObj={
    "username":String,
    "password":String,
    "fullName":String
}

const bookSchemaObj={
    "author":String,
    "title":String,
    "content":String,
    "createdAt":Date
}

const userSchema= new mongoose.Schema(userSchemaObj);
const bookSchema= new mongoose.Schema(bookSchemaObj);
const userModel=mongoose.model("userList",userSchema);
const bookModel= mongoose.model("bookList",bookSchema);

const app=express();
app.use(express.json());
app.set("trust proxy",1);
app.use(session({
    secret,
    cookie:{maxAge:1000*60*60*60}
}))

const AuthMiddleware=async (req,res,next)=>{
    if(req.session.token){
        const doc= await userModel.findOne({_id:req.session.token});
        if(doc){
            next();
        }else{
            res.sendStatus(401);
        }
    }else{
        res.sendStatus(401);
    }
}

app.post('/signup',async (req,res)=>{
    const {username,password,fullName}=req.body;
    if(username && password && fullName){
        const newUser=userModel({
            username,
            password,
            fullName
        })
        await newUser.save();
        res.send({id:newUser._id});

    }else{
        res.send(400);
    }
})

app.post('/login',async(req,res)=>{
    const {username,password}=req.body;
    if(username && password){
        const doc=await userModel.findOne({username});
        if(doc){
            req.session.token=doc._id;
            res.send({"token":doc._id,"expires":""+(60*60*60)})
        }else{
            res.send(400);
        }
    }else{
        res.send(400);
    }
})

app.post('/password',AuthMiddleware,async (req,res)=>{
    const {oldpassword,newpassword}=req.body;
    if(oldpassword && newpassword){
        const doc= await userModel.findOne({_id:req.session.token});
        if(doc && oldpassword===doc.password){
            await userModel.updateOne({_id:req.session.token},{password:newpassword});
            res.sendStatus(200);
        }
    }else{
        res.sendStatus(400);
    }
})


app.get('/user',AuthMiddleware,async (req,res)=>{
    const doc= await userModel.findOne({_id:req.session.token});
    if(doc){
        res.send({username:doc.username,fullName:doc.fullName});
    }else{
        res.send({err:"user not exist"});
    }
})

app.get('/user/:username',AuthMiddleware,async (req,res)=>{
    const username=req.params.username;
    const doc=await userModel.findOne({_id:req.session.token,username:username});
    if(doc){
        res.send({username:doc.username,fullName:doc.fullName});
    }else{
        res.status(400).send({err:"username is wrong"});
    }
})

//changing username and fullname
app.post('/user',AuthMiddleware,async (req,res)=>{
    const {username,fullName,password}=req.body;
    const doc=await userModel.findOne({_id:req.session.token});
    if(doc && password===doc.password){
        await userModel.updateOne({_id:req.session.token},{username,fullName})
        res.send(200);
    }else{
        res.send(400);
    }
    
})

app.delete('/user/:username',AuthMiddleware,async (req,res)=>{
    const username=req.params.username;
    await userModel.deleteOne({_id:req.session.token,username});
    res.send(200);
})

app.get('/post/:id',AuthMiddleware,async (req,res)=>{
    const id=req.params.id;
    const doc=await bookModel.findOne({_id:id});
    if(doc){
        res.send({
            id,
            author:doc.author,
            title:doc.title,
            content:doc.content,
            createdAt:doc.createdAt
        })
    }
})

app.post('/post',AuthMiddleware,async (req,res)=>{
    const {title,content}=req.body;
    const newBook=bookModel({
        "author":"author1",
        title,
        content,
        createdAt:new Date()
    })
    await newBook.save();
    res.send({id:newBook._id});

})
app.listen(9999,()=>{
    console.log("listening at 9999");
})