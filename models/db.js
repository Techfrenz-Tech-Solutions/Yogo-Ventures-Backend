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

// Runs `callback(txQuery)` against a single dedicated connection wrapped in
// a transaction — commits if callback resolves, rolls back if it throws/
// rejects. Needed anywhere a multi-step write (e.g. insert a product row +
// insert its image rows) must not partially apply: mainDb/mainDbForCron each
// grab a fresh pooled connection per call, so they can't share one
// transaction across statements the way this can.
exports.withTransaction = function (callback) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) return reject(err);

            connection.beginTransaction((txErr) => {
                if (txErr) {
                    connection.release();
                    return reject(txErr);
                }

                const txQuery = (query, values = []) => new Promise((res2, rej2) => {
                    connection.query(query, values, (qErr, result) => {
                        if (qErr) rej2(qErr); else res2(result);
                    });
                });

                Promise.resolve()
                    .then(() => callback(txQuery))
                    .then((result) => {
                        connection.commit((commitErr) => {
                            connection.release();
                            if (commitErr) return reject(commitErr);
                            resolve(result);
                        });
                    })
                    .catch((cbErr) => {
                        connection.rollback(() => {
                            connection.release();
                            reject(cbErr);
                        });
                    });
            });
        });
    });
};
