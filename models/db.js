const mysql = require("mysql");

// const pool = mysql.createPool({
//     connectionLimit: 50,          
//     connectTimeout: 30 * 1000,    
//     acquireTimeout: 60 * 1000,   
//     timeout: 60 * 1000,
//     multipleStatements: true,
//     host: "localhost",
//     user: "sa",
//     password: "sa@123456",
//     database: "Aandavartools",
//     port: 3306
// });


const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "yogoventures",
   // port: 3306,
    connectionLimit: 50,
    multipleStatements: true
});









exports.mainDb = async function (query, values, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("DB Connection Error:", err);
            return callback(err, null);
        }

        connection.query(query, values, (error, results, fields) => {
            connection.release();
            return callback(error, results);
        });
    });
};

exports.closePool = () => {
    pool.end(err => {
        if (err) console.error("Error closing pool:", err);
    });
};



exports.mainDbForCron = function (query, values = []) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error("DB Connection Error:", err);
                return reject(err);
            }

            connection.query(query, values, (error, results) => {
                connection.release();
                if (error) return reject(error);
                resolve(results);
            });
        });
    });
};