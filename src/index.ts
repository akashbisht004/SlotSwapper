import express from "express";

const app=express();
const PORT= process.env.PORT || 5000;

app.use(express.json());

app.use("/api", (req,res)=>{
    console.log("request hit    ");
});

app.listen(PORT, ()=>{
    console.log(`Server is running on PORT ${PORT}`);
});