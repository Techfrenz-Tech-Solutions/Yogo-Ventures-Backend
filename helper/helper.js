const jwt = require("jsonwebtoken");
const db = require("../models/db.js");

const helper = {};

// Generic CRUD Functions
helper.insert = (tableName, data) =>
    new Promise((resolve,reject) => {
        db.mainDb(`INSERT INTO \`${tableName}\` SET ?`, data, (err,result)=> err ? reject(err) : resolve(result));
    });

helper.selectAll = (tableName) =>
    new Promise((resolve,reject)=>{
        db.mainDb(`SELECT * FROM \`${tableName}\``, [], (err,result)=> err ? reject(err) : resolve(result));
    });

helper.selectOne = (tableName, keyColumn, keyValue) =>
    new Promise((resolve,reject)=>{
        db.mainDb(`SELECT * FROM \`${tableName}\` WHERE \`${keyColumn}\`=?`, [keyValue], (err,result)=> err ? reject(err) : resolve(result));
    });

helper.update = (tableName, keyColumn, keyValue, updateData) =>
    new Promise((resolve,reject)=>{
        db.mainDb(`UPDATE \`${tableName}\` SET ? WHERE \`${keyColumn}\`=?`, [updateData,keyValue], (err,result)=> err ? reject(err) : resolve(result));
    });

helper.delete = (tableName,keyColumn,keyValue)=>
    new Promise((resolve,reject)=>{
        db.mainDb(`DELETE FROM \`${tableName}\` WHERE \`${keyColumn}\`=?`, [keyValue], (err,result)=> err ? reject(err) : resolve(result));
    });

// App Maintenance Middleware
helper.appMaintenance = (req,res,next)=>{
    try{
        db.mainDb("SELECT is_maintenance FROM sitesetting LIMIT 1",(err,data)=>{
            if(err) return res.json({status:0,message:"Unable to check maintenance"});
            if(data.length && data[0].is_maintenance==1) return res.json({status:5,message:"Site under maintenance"});
            next();
        });
    }catch(err){ console.log(err); return res.json({status:0,message:"Something went wrong"});}
}

// JWT Auth Middleware
helper.auth = (req,res,next)=>{
    try{
        const authHeader = req.headers["authorization"];
        if(!authHeader) return res.json({status:0,message:"Auth token required"});
        const token = authHeader.split(" ")[1];
        if(!token) return res.json({status:0,message:"Invalid token"});
        jwt.verify(token,"SECRET@KEY",(err,decoded)=>{
            if(err) return res.json({status:0,message:"Invalid/expired token"});
            req.user = decoded;
            next();
        });
    }catch(err){ console.log(err); return res.json({status:0,message:"Auth failed"});}
}

module.exports = helper;