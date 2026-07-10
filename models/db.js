const mysql = require("mysql");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "yogoventures",
    // Table columns are utf8mb4 — without this the driver defaults to a
    // 3-byte utf8 connection charset, which corrupts any 4-byte character
    // (emoji) and mis-encodes other multi-byte characters (accents, en/em
    // dashes) on write.
    charset: "utf8mb4",
    connectionLimit: 50,
    // Stacked queries aren't needed by any live query and only widen the
    // blast radius of a future SQL-injection bug — keep this off.
    multipleStatements: false
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
