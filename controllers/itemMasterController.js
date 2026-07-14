const { Validator } = require("node-input-validator");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../models/db.js');
const { storageDir } = require('../helper/upload.js');
const quoteEmailService = require('../services/quoteEmailService.js');

// Best-effort delete of a previously-uploaded image by filename (as stored
// in the DB) — used when an update replaces an image or a record carrying
// images is deleted. Never throws; a missing/already-gone file is not an error.
function deleteStorageFile(filename) {
    if (!filename) return;
    fs.unlink(path.join(storageDir, filename), (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Failed to remove old image:', filename, err.message);
        }
    });
}

// Best-effort record of an admin action into activity_log — used only for
// actions that can't be reconstructed from other tables afterward (e.g.
// deletions, where the row itself is gone). Never throws / never blocks the
// caller's response; a failed log write shouldn't fail the underlying action.
function logActivity(actionType, description, referenceId) {
    db.mainDb(
        `INSERT INTO activity_log (action_type, description, reference_id) VALUES (?, ?, ?)`,
        [actionType, description, referenceId != null ? String(referenceId) : null],
        (err) => {
            if (err) console.error('Failed to write activity_log entry:', actionType, err.message);
        }
    );
}

// Create Enquiry
// A phone dialing code must be "+" followed by 1-4 digits — e.g. "+91",
// "+1", "+44". Rejects "91" (missing +), "++91" (double +), "+91abc"
// (trailing non-digits) and empty/overlong values.
const PHONE_CODE_PATTERN = /^\+[0-9]{1,4}$/;
function isValidPhoneCode(value) {
    return typeof value === 'string' && PHONE_CODE_PATTERN.test(value.trim());
}

exports.createCountry = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        country_code: 'required|string|maxLength:10',
        country_name: 'required|string|maxLength:100',
        phone_code:   'required|string|maxLength:10'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ status: 0, message: error_message });
        }

        if (!isValidPhoneCode(reqData.phone_code)) {
            return res.json({
                status: 0,
                message: "Phone code must start with '+' followed by 1-4 digits only (e.g. +91)."
            });
        }

        const insertQuery = `
            INSERT INTO country_master
            (country_code, country_name, phone_code)
            VALUES (?, ?, ?)`;

        db.mainDb(
            insertQuery,
            [reqData.country_code, reqData.country_name, reqData.phone_code.trim()],
            (err, result) => {
                if (err) {
                    return res.json({ status: 0, message: "DB error" });
                }

                return res.json({
                    status: 1,
                    message: "Country created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


exports.getCountries = (req, res) => {
    db.mainDb(
        `SELECT * FROM country_master ORDER BY id DESC`,
        [],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCountry = (req, res) => {
    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM country_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Country not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCountry = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        country_code: 'required|string|maxLength:10',
        country_name: 'required|string|maxLength:100',
        phone_code:   'required|string|maxLength:10'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        if (!isValidPhoneCode(reqData.phone_code)) {
            return res.json({
                status: 0,
                message: "Phone code must start with '+' followed by 1-4 digits only (e.g. +91)."
            });
        }

        const updateQuery = `
            UPDATE country_master
            SET country_code = ?, country_name = ?, phone_code = ?
            WHERE id = ?`;

        db.mainDb(
            updateQuery,
            [
                reqData.country_code,
                reqData.country_name,
                reqData.phone_code.trim(),
                reqData.id
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Country not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Country updated successfully"
                });
            }
        );
    });
};

exports.deleteCountry = (req, res) => {
    const id = req.body.id;

    db.mainDb(
        `DELETE FROM country_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Country not found"
                });
            }

            return res.json({
                status: 1,
                message: "Country deleted successfully"
            });
        }
    );
};
//----------------------------------------------------
exports.createCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        category_code: 'required|string|maxLength:20',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ status: 0, message: error_message });
        }

        const insertQuery = `
            INSERT INTO category_master
            (category_code, category_name)
            VALUES (?, ?)`;

        db.mainDb(
            insertQuery,
            [reqData.category_code, reqData.category_name],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.json({ status: 0, message: "Category code already exists. Please use a different code." });
                    }
                    return res.json({ status: 0, message: "DB error" });
                }

                return res.json({
                    status: 1,
                    message: "Category created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


exports.getCategories = (req, res) => {
    db.mainDb(
        `SELECT * FROM category_master ORDER BY id DESC`,
        [],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCategory = (req, res) => {
    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM category_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Category not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        category_code: 'required|string|maxLength:20',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const updateQuery = `
            UPDATE category_master
            SET category_code = ?, category_name = ?
            WHERE id = ?`;

        db.mainDb(
            updateQuery,
            [
                reqData.category_code,
                reqData.category_name,
                reqData.id
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Category not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Category updated successfully"
                });
            }
        );
    });
};



exports.deleteCategory = (req, res) => {
    const id = req.body.id;

    db.mainDb(
        `DELETE FROM category_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Category not found"
                });
            }

            return res.json({
                status: 1,
                message: "Category deleted successfully"
            });
        }
    );
};



exports.categoryDropdown = (req, res) => {

    const query = `
        SELECT
            id,
            category_name
        FROM category_master
        ORDER BY id ASC
    `;

    db.mainDb(query, [], (err, result) => {
        if (err) {
            return res.json({
                status: 0,
                message: "DB error"
            });
        }

        return res.json({
            status: 1,
            data: result
        });
    });
};


// Country Dropdown (public — used by the website's contact form)
exports.countryDropdown = (req, res) => {

    const query = `
        SELECT
            id,
            country_name,
            phone_code
        FROM country_master
        ORDER BY id ASC
    `;

    db.mainDb(query, [], (err, result) => {
        if (err) {
            return res.json({
                status: 0,
                message: "DB error"
            });
        }

        return res.json({
            status: 1,
            data: result
        });
    });
};

//-----------------------------------------------------------------------------

// Create Sub Category
exports.createSubCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        sub_category_code: 'required|string|maxLength:20',
        sub_category_name: 'required|string|maxLength:100',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then(async (matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        // sub_category_master has no DB-level unique constraint on
        // sub_category_code (legacy data already has duplicates), so
        // uniqueness is enforced here at the application level instead.
        try {
            const existing = await dbQueryAsync(
                `SELECT id FROM sub_category_master WHERE sub_category_code = ?`,
                [reqData.sub_category_code]
            );
            if (existing.length > 0) {
                return res.json({ status: 0, message: "Sub category code already exists. Please use a different code." });
            }
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }

        const query = `
            INSERT INTO sub_category_master
            (
                sub_category_code,
                sub_category_name,
                category_name
            )
            VALUES (?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.sub_category_code,
                reqData.sub_category_name,
                reqData.category_name
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sub Category created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


// List Sub Categories
exports.getSubCategories = (req, res) => {

    db.mainDb(
        `SELECT * FROM sub_category_master ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


// Get Single Sub Category
exports.getSubCategory = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM sub_category_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Sub Category not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


// Update Sub Category
exports.updateSubCategory = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        sub_category_code: 'required|string|maxLength:20',
        sub_category_name: 'required|string|maxLength:100',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE sub_category_master
            SET
                sub_category_code = ?,
                sub_category_name = ?,
                category_name = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.sub_category_code,
                reqData.sub_category_name,
                reqData.category_name,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Sub Category not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sub Category updated successfully"
                });
            }
        );
    });
};


// Delete Sub Category
exports.deleteSubCategory = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM sub_category_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Sub Category not found"
                });
            }

            return res.json({
                status: 1,
                message: "Sub Category deleted successfully"
            });
        }
    );
};


// Sub Category Dropdown
exports.subCategoryDropdown = (req, res) => {

    db.mainDb(
        `SELECT
            id AS value,
            sub_category_name AS label
         FROM sub_category_master
         ORDER BY sub_category_name`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};
//---------------------------------------------------------------------------

exports.createProduct = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'required|string|maxLength:100',
        product_description: 'required|string'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        // product_master has no DB-level unique constraint on product_code
        // (legacy data already has duplicates), so uniqueness is enforced
        // here at the application level instead.
        try {
            const existing = await dbQueryAsync(
                `SELECT id FROM product_master WHERE product_code = ?`,
                [reqData.product_code]
            );
            if (existing.length > 0) {
                return res.json({ status: 0, message: "Product code already exists. Please use a different code." });
            }
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }

        const files = req.files || {};
        const indexImage = files.index_image?.[0]?.filename || '';
        const variationFiles = files.variation_images || [];

        // Product row + its variation_images rows are inserted in one
        // transaction so a mid-way failure (e.g. an image insert error)
        // can't leave a product with no images or an orphaned image row
        // pointing at a non-existent product.
        try {
            const productId = await db.withTransaction(async (txQuery) => {
                const insertResult = await txQuery(
                    `INSERT INTO product_master
                     (product_code, product_name, category_name, sub_category_name, product_description, index_image, image1, image2, image3, image4, image5)
                     VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', '')`,
                    [
                        reqData.product_code,
                        reqData.product_name,
                        reqData.category_name,
                        reqData.sub_category_name,
                        reqData.product_description,
                        indexImage
                    ]
                );

                const newProductId = insertResult.insertId;
                for (let i = 0; i < variationFiles.length; i++) {
                    await txQuery(
                        `INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)`,
                        [newProductId, variationFiles[i].filename, i]
                    );
                }
                return newProductId;
            });

            return res.json({
                status: 1,
                message: "Product created successfully",
                id: productId
            });
        } catch (err) {
            // Nothing was committed — clean up the files that were already
            // written to disk so a failed create doesn't orphan them.
            if (indexImage) deleteStorageFile(indexImage);
            variationFiles.forEach(f => deleteStorageFile(f.filename));
            return res.json({ status: 0, message: "DB error" });
        }
    });
};



// Groups a flat product_images result set into { [product_id]: [rows] },
// each product's rows already ordered by sort_order (then id as a tiebreaker)
// thanks to the ORDER BY in the calling query.
function groupImagesByProduct(imageRows) {
    const map = {};
    for (const row of imageRows) {
        (map[row.product_id] = map[row.product_id] || []).push({
            id: row.id,
            image_path: row.image_path,
            sort_order: row.sort_order
        });
    }
    return map;
}

exports.getProducts = async (req, res) => {
    try {
        const products = await dbQueryAsync(`SELECT * FROM product_master ORDER BY id DESC`);

        const ids = products.map(p => p.id);
        let imagesByProduct = {};
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            const imageRows = await dbQueryAsync(
                `SELECT id, product_id, image_path, sort_order FROM product_images WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order, id`,
                ids
            );
            imagesByProduct = groupImagesByProduct(imageRows);
        }

        const data = products.map(p => ({
            ...p,
            // variation_images is the new source of truth; image1..image5
            // are kept in the row (untouched, legacy) for anything still
            // reading them directly, but no longer meant to be relied on.
            variation_images: imagesByProduct[p.id] || []
        }));

        return res.json({ status: 1, data });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};


exports.getProduct = async (req, res) => {

    const id = req.params.id;

    try {
        const rows = await dbQueryAsync(`SELECT * FROM product_master WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Product not found" });
        }

        const imageRows = await dbQueryAsync(
            `SELECT id, product_id, image_path, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id`,
            [id]
        );

        return res.json({
            status: 1,
            data: {
                ...rows[0],
                variation_images: imageRows.map(r => ({ id: r.id, image_path: r.image_path, sort_order: r.sort_order }))
            }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};



exports.updateProduct = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'required|string|maxLength:100',
        product_description: 'required|string'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const files = req.files || {};
        const newIndexImage = files.index_image?.[0]?.filename || null;
        const newVariationFiles = files.variation_images || [];

        // delete_image_ids: JSON array of product_images.id the admin removed
        // in the edit form. Only ids that actually belong to *this* product
        // are ever deleted (see the WHERE product_id = ? below) — an id for
        // someone else's product is silently ignored, never acted on.
        let deleteImageIds = [];
        if (reqData.delete_image_ids) {
            try {
                const parsed = JSON.parse(reqData.delete_image_ids);
                if (Array.isArray(parsed)) {
                    deleteImageIds = parsed.map(Number).filter(Number.isInteger);
                }
            } catch {
                // ignore malformed input — nothing gets deleted
            }
        }

        try {
            const { replacedIndexImage, deletedImagePaths } = await db.withTransaction(async (txQuery) => {
                const existingRows = await txQuery(
                    `SELECT index_image FROM product_master WHERE id = ?`,
                    [reqData.id]
                );
                if (existingRows.length === 0) {
                    const notFound = new Error('Product not found');
                    notFound.isNotFound = true;
                    throw notFound;
                }

                const existingIndexImage = existingRows[0].index_image;
                const indexImageToStore = newIndexImage || existingIndexImage || '';

                const updateResult = await txQuery(
                    `UPDATE product_master
                     SET product_code = ?, product_name = ?, category_name = ?, sub_category_name = ?, product_description = ?, index_image = ?
                     WHERE id = ?`,
                    [
                        reqData.product_code,
                        reqData.product_name,
                        reqData.category_name,
                        reqData.sub_category_name,
                        reqData.product_description,
                        indexImageToStore,
                        reqData.id
                    ]
                );
                if (updateResult.affectedRows === 0) {
                    const notFound = new Error('Product not found');
                    notFound.isNotFound = true;
                    throw notFound;
                }

                let deletedPaths = [];
                if (deleteImageIds.length > 0) {
                    const placeholders = deleteImageIds.map(() => '?').join(',');
                    const toDelete = await txQuery(
                        `SELECT id, image_path FROM product_images WHERE product_id = ? AND id IN (${placeholders})`,
                        [reqData.id, ...deleteImageIds]
                    );
                    if (toDelete.length > 0) {
                        const delPlaceholders = toDelete.map(() => '?').join(',');
                        await txQuery(
                            `DELETE FROM product_images WHERE id IN (${delPlaceholders})`,
                            toDelete.map(r => r.id)
                        );
                        deletedPaths = toDelete.map(r => r.image_path);
                    }
                }

                if (newVariationFiles.length > 0) {
                    const maxRows = await txQuery(
                        `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM product_images WHERE product_id = ?`,
                        [reqData.id]
                    );
                    let nextOrder = maxRows[0].maxOrder + 1;
                    for (const f of newVariationFiles) {
                        await txQuery(
                            `INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)`,
                            [reqData.id, f.filename, nextOrder++]
                        );
                    }
                }

                return {
                    replacedIndexImage: (newIndexImage && existingIndexImage && existingIndexImage !== newIndexImage) ? existingIndexImage : null,
                    deletedImagePaths: deletedPaths
                };
            });

            // Only remove replaced/deleted files once the DB write has
            // actually committed, so a failed update never leaves a product
            // referencing a file that no longer exists on disk.
            if (replacedIndexImage) deleteStorageFile(replacedIndexImage);
            deletedImagePaths.forEach(deleteStorageFile);

            return res.json({
                status: 1,
                message: "Product updated successfully"
            });
        } catch (err) {
            // Transaction rolled back — nothing was persisted, so any files
            // uploaded on this request are orphaned and must be cleaned up.
            if (newIndexImage) deleteStorageFile(newIndexImage);
            newVariationFiles.forEach(f => deleteStorageFile(f.filename));

            if (err && err.isNotFound) {
                return res.json({ status: 0, message: "Product not found" });
            }
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

exports.deleteProduct = async (req, res) => {

    const id = req.body.id;

    try {
        const existingRows = await dbQueryAsync(
            `SELECT product_code, product_name, index_image, image1, image2, image3, image4, image5 FROM product_master WHERE id = ?`,
            [id]
        );

        // Variation image file paths, read before the delete — once the
        // product_master row is gone, ON DELETE CASCADE removes the
        // product_images rows too, so this is the only chance to know
        // which files on disk need cleaning up.
        const variationImageRows = await dbQueryAsync(
            `SELECT image_path FROM product_images WHERE product_id = ?`,
            [id]
        );

        const result = await dbQueryAsync(`DELETE FROM product_master WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.json({ status: 0, message: "Product not found" });
        }

        if (existingRows.length > 0) {
            ['index_image', 'image1', 'image2', 'image3', 'image4', 'image5']
                .forEach((field) => deleteStorageFile(existingRows[0][field]));

            logActivity(
                'product_deleted',
                `Product deleted — ${existingRows[0].product_name}`,
                existingRows[0].product_code
            );
        }
        variationImageRows.forEach((row) => deleteStorageFile(row.image_path));

        return res.json({
            status: 1,
            message: "Product deleted successfully"
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

//------------------------------------------------------------------------------

// Generates a customer-facing reference like "YQ-20260711-8SNKBTVF" (or
// "CR-..." for contact enquiries). Uses crypto.randomBytes (not Math.random)
// so it can't be guessed/enumerated.
function generateReferenceNumber(prefix = 'YQ') {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8);
    return `${prefix}-${datePart}-${randomPart}`;
}

const PUBLIC_ASSET_BASE_URL = (process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/+$/, '');
function buildStorageUrl(filename) {
    if (!filename || !PUBLIC_ASSET_BASE_URL) return '';
    return `${PUBLIC_ASSET_BASE_URL}/storage/${filename}`;
}

// Re-fetches product name/image from product_master by id rather than
// trusting whatever the browser sent — quantity/color/variant are free-text
// enquiry details (low risk, not re-derivable from a product row) and are
// kept as submitted, but clamped/sanitised.
async function resolveCartItems(itemsRaw) {
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) return [];

    const productIds = [...new Set(
        itemsRaw
            .map((i) => parseInt(i.product_id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];

    let productsById = {};
    if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const rows = await db.mainDbForCron(
            `SELECT id, product_name, index_image FROM product_master WHERE id IN (${placeholders})`,
            productIds
        );
        productsById = Object.fromEntries(rows.map((r) => [r.id, r]));
    }

    return itemsRaw.slice(0, 100).map((raw) => {
        const productId = parseInt(raw.product_id, 10);
        const product = Number.isInteger(productId) ? productsById[productId] : undefined;

        const quantity = Math.min(Math.max(parseInt(raw.quantity ?? raw.qty ?? 1, 10) || 1, 1), 9999);
        const name = (product?.product_name || String(raw.product_name || 'Item')).slice(0, 255);
        const variant = raw.variant ? String(raw.variant).slice(0, 100) : '';
        const color = raw.color ? String(raw.color).slice(0, 100) : '';
        const image = product?.index_image ? buildStorageUrl(product.index_image) : '';

        return {
            product_id: Number.isInteger(productId) ? productId : null,
            product_name: name,
            quantity,
            variant,
            color,
            image,
        };
    });
}

exports.createEnquiryQuote = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255',
        qty: 'required|integer',
        color: 'required|string|maxLength:100',
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        message: 'required|string'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        let items;
        try {
            items = await resolveCartItems(reqData.items);
        } catch (err) {
            console.error('Failed to resolve cart items for quote enquiry:', err.message);
            items = [];
        }

        const referenceNumber = generateReferenceNumber();
        const itemsJson = JSON.stringify(items);

        const query = `
            INSERT INTO get_enquire_quote
            (
                product_name,
                qty,
                color,
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                message,
                status,
                reference_number,
                items_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                reqData.qty,
                reqData.color,
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.message,
                referenceNumber,
                itemsJson
            ],
            async (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                const quoteId = result.insertId;
                let emailResult = { sent: false, status: 'failed' };
                try {
                    emailResult = await quoteEmailService.sendQuoteConfirmation({
                        id: quoteId,
                        first_name: reqData.first_name,
                        last_name: reqData.last_name,
                        email_id: reqData.email_id,
                        phone_number: reqData.phone_number,
                        country: reqData.country,
                        message: reqData.message,
                        reference_number: referenceNumber,
                        created_date: new Date(),
                        items,
                    });
                } catch (emailErr) {
                    // The quote is already committed — a mailer-level failure here
                    // must never roll back or invalidate it.
                    console.error(`Unexpected error sending confirmation email for quote #${quoteId}:`, emailErr.message);
                }

                return res.json({
                    status: 1,
                    message: "Enquiry Quote submitted successfully",
                    id: quoteId,
                    quote_reference: referenceNumber,
                    email: emailResult
                });
            }
        );
    });
};


exports.getEnquiryQuotes = (req, res) => {

    db.mainDb(
        `SELECT * FROM get_enquire_quote ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};



exports.getEnquiryQuote = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM get_enquire_quote WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry Quote not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateEnquiryQuoteStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE get_enquire_quote
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Enquiry Quote not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteEnquiryQuote = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM get_enquire_quote WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry Quote not found"
                });
            }

            return res.json({
                status: 1,
                message: "Enquiry Quote deleted successfully"
            });
        }
    );
};

//------------------------------------------------------------------------------

exports.createContactUs = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        subject: 'required|string|maxLength:255',
        message: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const referenceNumber = generateReferenceNumber('CR');

        const query = `
            INSERT INTO contact_us_enquiry
            (
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                subject,
                message,
                status,
                reference_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        `;

        db.mainDb(
            query,
            [
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.subject,
                reqData.message,
                referenceNumber
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Contact enquiry submitted successfully",
                    id: result.insertId,
                    contact_reference: referenceNumber
                });
            }
        );
    });
};


exports.getContactUsList = (req, res) => {

    db.mainDb(
        `SELECT * FROM contact_us_enquiry ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};



exports.getContactUs = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM contact_us_enquiry WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Contact enquiry not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


exports.updateContactUsStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE contact_us_enquiry
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Contact enquiry not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteContactUs = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM contact_us_enquiry WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Contact enquiry not found"
                });
            }

            return res.json({
                status: 1,
                message: "Contact enquiry deleted successfully"
            });
        }
    );
};

//-----------------------------------------------------------------------------

// Create Best Selling
exports.createBestSelling = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const image = req.file ? req.file.filename : '';

        const query = `
            INSERT INTO best_selling
            (
                product_name,
                image
            )
            VALUES (?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                image
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Best Selling created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


// Get Best Selling List
exports.getBestSellingList = (req, res) => {

    db.mainDb(
        `SELECT * FROM best_selling ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


// Get Single Best Selling
exports.getBestSelling = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM best_selling WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Best Selling not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


// Update Best Selling
exports.updateBestSelling = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const runUpdate = (image, oldImageToDelete) => {
            const query = `
                UPDATE best_selling
                SET
                    product_name = ?,
                    image = ?
                WHERE id = ?
            `;

            db.mainDb(
                query,
                [
                    reqData.product_name,
                    image,
                    reqData.id
                ],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Best Selling not found"
                        });
                    }

                    if (oldImageToDelete) deleteStorageFile(oldImageToDelete);

                    return res.json({
                        status: 1,
                        message: "Best Selling updated successfully"
                    });
                }
            );
        };

        db.mainDb(
            `SELECT image FROM best_selling WHERE id = ?`,
            [reqData.id],
            (err, existing) => {
                if (err || existing.length === 0) {
                    return res.json({ status: 0, message: "Best Selling not found" });
                }
                if (req.file) {
                    const oldImage = existing[0].image;
                    runUpdate(req.file.filename, oldImage && oldImage !== req.file.filename ? oldImage : null);
                } else {
                    runUpdate(existing[0].image, null);
                }
            }
        );
    });
};


// Delete Best Selling
exports.deleteBestSelling = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT image FROM best_selling WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

    db.mainDb(
        `DELETE FROM best_selling WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Best Selling not found"
                });
            }

            if (existingRows.length > 0) deleteStorageFile(existingRows[0].image);

            return res.json({
                status: 1,
                message: "Best Selling deleted successfully"
            });
        }
    );
        }
    );
};
//----------------------------------------------------------------------

exports.createNewArrival = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const image = req.file ? req.file.filename : '';

        const query = `
            INSERT INTO new_arrivals
            (
                product_name,
                image
            )
            VALUES (?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                image
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "New Arrival created successfully",
                    id: result.insertId
                });
            }
        );
    });
};

exports.getNewArrivalList = (req, res) => {

    db.mainDb(
        `SELECT * FROM new_arrivals ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getNewArrival = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM new_arrivals WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "New Arrival not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};

exports.updateNewArrival = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const runUpdate = (image, oldImageToDelete) => {
            const query = `
                UPDATE new_arrivals
                SET
                    product_name = ?,
                    image = ?
                WHERE id = ?
            `;

            db.mainDb(
                query,
                [
                    reqData.product_name,
                    image,
                    reqData.id
                ],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "New Arrival not found"
                        });
                    }

                    if (oldImageToDelete) deleteStorageFile(oldImageToDelete);

                    return res.json({
                        status: 1,
                        message: "New Arrival updated successfully"
                    });
                }
            );
        };

        db.mainDb(
            `SELECT image FROM new_arrivals WHERE id = ?`,
            [reqData.id],
            (err, existing) => {
                if (err || existing.length === 0) {
                    return res.json({ status: 0, message: "New Arrival not found" });
                }
                if (req.file) {
                    const oldImage = existing[0].image;
                    runUpdate(req.file.filename, oldImage && oldImage !== req.file.filename ? oldImage : null);
                } else {
                    runUpdate(existing[0].image, null);
                }
            }
        );
    });
};


exports.deleteNewArrival = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT image FROM new_arrivals WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

    db.mainDb(
        `DELETE FROM new_arrivals WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "New Arrival not found"
                });
            }

            if (existingRows.length > 0) deleteStorageFile(existingRows[0].image);

            return res.json({
                status: 1,
                message: "New Arrival deleted successfully"
            });
        }
    );
        }
    );
};

//-----------------------------------------------------------------------------

exports.createEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        product_category: 'required|string|maxLength:255',
        message: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const referenceNumber = generateReferenceNumber('ENQ');

        const query = `
            INSERT INTO enquiries
            (
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                product_category,
                message,
                status,
                reference_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        `;

        db.mainDb(
            query,
            [
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.product_category,
                reqData.message,
                referenceNumber
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Enquiry submitted successfully",
                    id: result.insertId,
                    enquiry_reference: referenceNumber
                });
            }
        );
    });
};


exports.getEnquiries = (req, res) => {

    db.mainDb(
        `SELECT * FROM enquiries ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getEnquiry = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM enquiries WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


exports.updateEnquiryStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE enquiries
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Enquiry not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteEnquiry = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM enquiries WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry not found"
                });
            }

            return res.json({
                status: 1,
                message: "Enquiry deleted successfully"
            });
        }
    );
};
//---------------------------------------------------------------------------

exports.createCustomer = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        customer_name: 'required|string|maxLength:255',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            INSERT INTO customer_master
            (
                customer_name,
                email_id,
                country,
                phone_number
            )
            VALUES (?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.customer_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Customer created successfully",
                    id: result.insertId
                });
            }
        );
    });
};

exports.getCustomers = (req, res) => {

    db.mainDb(
        `SELECT * FROM customer_master ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCustomer = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM customer_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Customer not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCustomer = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        customer_name: 'required|string|maxLength:255',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE customer_master
            SET
                customer_name = ?,
                email_id = ?,
                country = ?,
                phone_number = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.customer_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Customer not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Customer updated successfully"
                });
            }
        );
    });
};


exports.deleteCustomer = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM customer_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Customer not found"
                });
            }

            return res.json({
                status: 1,
                message: "Customer deleted successfully"
            });
        }
    );
};

//-----------------------------------------------------------------------------
exports.createOrderTracking = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        order_id: 'required|string|maxLength:100',
        customer_id: 'required|integer',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const { dates, error } = prepareOrderDates(reqData.dates);
        if (error) {
            return res.json({ status: 0, message: error });
        }

        try {
            const existingOrder = await dbQueryAsync(`SELECT id FROM order_tracking WHERE order_id = ?`, [reqData.order_id]);
            if (existingOrder.length > 0) {
                return res.json({ status: 0, message: "Order ID already exists. Please use a different Order ID." });
            }

            const existingCustomer = await dbQueryAsync(`SELECT id FROM customer_master WHERE id = ?`, [reqData.customer_id]);
            if (existingCustomer.length === 0) {
                return res.json({ status: 0, message: "Selected customer does not exist." });
            }

            const newId = await db.withTransaction(async (txQuery) => {
                const insertResult = await txQuery(
                    `INSERT INTO order_tracking (order_id, customer_id, product_name, quantity) VALUES (?, ?, ?, ?)`,
                    [reqData.order_id, reqData.customer_id, reqData.product_name, reqData.quantity]
                );
                const orderTrackingId = insertResult.insertId;

                for (const d of dates) {
                    const titleId = await findOrCreateDateTitle(txQuery, d.title);
                    await txQuery(
                        `INSERT INTO order_dates (order_tracking_id, date_title_id, date_value) VALUES (?, ?, ?)`,
                        [orderTrackingId, titleId, d.value]
                    );
                }

                return orderTrackingId;
            });

            return res.json({
                status: 1,
                message: "Order Tracking created successfully",
                id: newId
            });
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

exports.getOrderTrackingList = async (req, res) => {
    try {
        const orders = await dbQueryAsync(
            `SELECT id, order_id, customer_id, product_name, quantity, created_date, updated_date FROM order_tracking ORDER BY id DESC`
        );

        const customerIds = [...new Set(orders.map(o => o.customer_id))];
        let customerById = {};
        if (customerIds.length > 0) {
            const placeholders = customerIds.map(() => '?').join(',');
            const customers = await dbQueryAsync(
                `SELECT id, customer_name FROM customer_master WHERE id IN (${placeholders})`,
                customerIds
            );
            customerById = Object.fromEntries(customers.map(c => [c.id, c.customer_name]));
        }

        const orderIds = orders.map(o => o.id);
        let datesByOrder = {};
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const dateRows = await dbQueryAsync(
                `SELECT od.order_tracking_id, odt.display_name, odt.normalised_name, od.date_value
                 FROM order_dates od
                 JOIN order_date_titles odt ON odt.id = od.date_title_id
                 WHERE od.order_tracking_id IN (${placeholders})
                 ORDER BY odt.display_name`,
                orderIds
            );
            for (const row of dateRows) {
                (datesByOrder[row.order_tracking_id] = datesByOrder[row.order_tracking_id] || []).push({
                    title: row.display_name,
                    normalisedTitle: row.normalised_name,
                    value: row.date_value
                });
            }
        }

        const data = orders.map(o => ({
            id: o.id,
            order_id: o.order_id,
            customer_id: o.customer_id,
            customer_name: customerById[o.customer_id] || null,
            product_name: o.product_name,
            quantity: o.quantity,
            created_date: o.created_date,
            updated_date: o.updated_date,
            dates: datesByOrder[o.id] || []
        }));

        return res.json({ status: 1, data });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getOrderTracking = async (req, res) => {

    const id = req.params.id;

    try {
        const rows = await dbQueryAsync(
            `SELECT id, order_id, customer_id, product_name, quantity, created_date, updated_date FROM order_tracking WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Order Tracking not found" });
        }

        const dateRows = await dbQueryAsync(
            `SELECT odt.display_name, odt.normalised_name, od.date_value
             FROM order_dates od
             JOIN order_date_titles odt ON odt.id = od.date_title_id
             WHERE od.order_tracking_id = ?
             ORDER BY odt.display_name`,
            [id]
        );
        const customerRows = await dbQueryAsync(`SELECT customer_name FROM customer_master WHERE id = ?`, [rows[0].customer_id]);

        return res.json({
            status: 1,
            data: {
                ...rows[0],
                customer_name: customerRows[0]?.customer_name || null,
                dates: dateRows.map(r => ({ title: r.display_name, normalisedTitle: r.normalised_name, value: r.date_value }))
            }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};


exports.updateOrderTracking = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        order_id: 'required|string|maxLength:100',
        customer_id: 'required|integer',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const { dates, error } = prepareOrderDates(reqData.dates);
        if (error) {
            return res.json({ status: 0, message: error });
        }

        try {
            const existingCustomer = await dbQueryAsync(`SELECT id FROM customer_master WHERE id = ?`, [reqData.customer_id]);
            if (existingCustomer.length === 0) {
                return res.json({ status: 0, message: "Selected customer does not exist." });
            }

            const dupOrderId = await dbQueryAsync(
                `SELECT id FROM order_tracking WHERE order_id = ? AND id != ?`,
                [reqData.order_id, reqData.id]
            );
            if (dupOrderId.length > 0) {
                return res.json({ status: 0, message: "Order ID already exists. Please use a different Order ID." });
            }

            await db.withTransaction(async (txQuery) => {
                const updateResult = await txQuery(
                    `UPDATE order_tracking SET order_id = ?, customer_id = ?, product_name = ?, quantity = ? WHERE id = ?`,
                    [reqData.order_id, reqData.customer_id, reqData.product_name, reqData.quantity, reqData.id]
                );
                if (updateResult.affectedRows === 0) {
                    const notFound = new Error('Order Tracking not found');
                    notFound.isNotFound = true;
                    throw notFound;
                }

                // Remove only this order's value for a title the admin took
                // out of the form — the title row itself (and any other
                // order's use of it) is never touched here.
                const existingDateRows = await txQuery(
                    `SELECT od.id, odt.normalised_name
                     FROM order_dates od
                     JOIN order_date_titles odt ON odt.id = od.date_title_id
                     WHERE od.order_tracking_id = ?`,
                    [reqData.id]
                );
                const submittedNormalised = new Set(dates.map(d => d.normalised));
                for (const row of existingDateRows) {
                    if (!submittedNormalised.has(row.normalised_name)) {
                        await txQuery(`DELETE FROM order_dates WHERE id = ?`, [row.id]);
                    }
                }

                for (const d of dates) {
                    const titleId = await findOrCreateDateTitle(txQuery, d.title);
                    await txQuery(
                        `INSERT INTO order_dates (order_tracking_id, date_title_id, date_value)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE date_value = VALUES(date_value)`,
                        [reqData.id, titleId, d.value]
                    );
                }
            });

            return res.json({
                status: 1,
                message: "Order Tracking updated successfully"
            });
        } catch (err) {
            if (err && err.isNotFound) {
                return res.json({ status: 0, message: "Order Tracking not found" });
            }
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

exports.deleteOrderTracking = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT order_id, product_name FROM order_tracking WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

            db.mainDb(
                `DELETE FROM order_tracking WHERE id = ?`,
                [id],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Order Tracking not found"
                        });
                    }

                    if (existingRows.length > 0) {
                        logActivity(
                            'order_deleted',
                            `Order deleted — ${existingRows[0].product_name}`,
                            existingRows[0].order_id
                        );
                    }

                    return res.json({
                        status: 1,
                        message: "Order Tracking deleted successfully"
                    });
                }
            );
        }
    );
};

//-------------------------------------------------------------------


exports.createSampleEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        enquiry_id: 'required|integer',
        customer_id: 'required|integer',
        enquired_on: 'required|date',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer',
        responded: 'required|string',
        sample_ordered: 'required|string',
        sample_shipped: 'required|string',
        order_placed: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });

        }

        const query = `
            INSERT INTO sample_enquiry
            (
                enquiry_id,
                customer_id,
                enquired_on,
                product_name,
                quantity,
                responded,
                sample_ordered,
                sample_shipped,
                order_placed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.enquiry_id,
                reqData.customer_id,
                reqData.enquired_on,
                reqData.product_name,
                reqData.quantity,
                reqData.responded,
                reqData.sample_ordered,
                reqData.sample_shipped,
                reqData.order_placed
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sample enquiry created successfully"
                });

            }
        );

    });

};






exports.getSampleEnquiries = (req, res) => {

    // LEFT JOIN (not INNER) so a sample enquiry whose customer_id no longer
    // matches a row in customer_master (deleted customer) still comes back —
    // customer_name is simply NULL in that case, handled on the frontend.
    db.mainDb(
        `SELECT se.*, cm.customer_name AS customer_name
         FROM sample_enquiry se
         LEFT JOIN customer_master cm ON cm.id = se.customer_id
         ORDER BY se.enquiry_id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });

        }
    );

};



exports.getSampleEnquiry = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM sample_enquiry WHERE enquiry_id=?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length == 0) {

                return res.json({
                    status: 0,
                    message: "Sample enquiry not found"
                });

            }

            return res.json({
                status: 1,
                data: result[0]
            });

        }
    );

};




exports.updateSampleEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        enquiry_id: 'required|integer',
        customer_id: 'required|integer',
        enquired_on: 'required|date',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer',
        responded: 'required|string',
        sample_ordered: 'required|string',
        sample_shipped: 'required|string',
        order_placed: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });

        }

        const query = `
            UPDATE sample_enquiry
            SET
                customer_id=?,
                enquired_on=?,
                product_name=?,
                quantity=?,
                responded=?,
                sample_ordered=?,
                sample_shipped=?,
                order_placed=?
            WHERE enquiry_id=?
        `;

        db.mainDb(
            query,
            [
                reqData.customer_id,
                reqData.enquired_on,
                reqData.product_name,
                reqData.quantity,
                reqData.responded,
                reqData.sample_ordered,
                reqData.sample_shipped,
                reqData.order_placed,
                reqData.enquiry_id
            ],
            (err, result) => {

                if (err) {

                    return res.json({
                        status: 0,
                        message: "DB error"
                    });

                }

                if (result.affectedRows == 0) {

                    return res.json({
                        status: 0,
                        message: "Sample enquiry not found"
                    });

                }

                return res.json({
                    status: 1,
                    message: "Sample enquiry updated successfully"
                });

            }
        );

    });

};


exports.deleteSampleEnquiry = (req, res) => {

    const id = req.body.enquiry_id;

    db.mainDb(
        `DELETE FROM sample_enquiry WHERE enquiry_id=?`,
        [id],
        (err, result) => {

            if (err) {

                return res.json({
                    status: 0,
                    message: "DB error"
                });

            }

            if (result.affectedRows == 0) {

                return res.json({
                    status: 0,
                    message: "Sample enquiry not found"
                });

            }

            return res.json({
                status: 1,
                message: "Sample enquiry deleted successfully"
            });

        }
    );

};

//-------------------------------------------------------------------

// Real (non-mocked) admin notification feed. Combines recent creates/
// updates read directly from each table's own timestamp columns with
// deletion events recorded in activity_log (see logActivity above), since
// deleted rows can't be reconstructed after the fact. Each UNION branch is
// independently capped at 20 rows before the final sort + limit so one
// noisy table can't starve the others out of a 20-row page.
// Table collations differ (older tables are utf8mb4_general_ci, newer ones
// default to the server's utf8mb4_0900_ai_ci) — UNION refuses to combine
// text columns of different collations, so every text column is coerced to
// a single common collation explicitly.
const RECENT_ACTIVITY_QUERY = `
    (
        SELECT CONVERT('quote_created' USING utf8mb4) COLLATE utf8mb4_general_ci AS action_type,
               CONVERT(CONCAT('New quote enquiry from ', first_name, ' ', last_name, ' \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci AS description,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci AS reference_id,
               created_date AS activity_time
        FROM get_enquire_quote
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('contact_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New contact enquiry from ', first_name, ' ', last_name, ' \u2014 ', subject) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM contact_us_enquiry
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('enquiry_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New general enquiry from ', first_name, ' ', last_name, ' \u2014 ', product_category) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM enquiries
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('sample_enquiry_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New sample enquiry \u2014 ', product_name, ' (qty ', quantity, ')') USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('#', enquiry_id) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_at
        FROM sample_enquiry
        ORDER BY created_at DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('order_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New order placed \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(order_id USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM order_tracking
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('product_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('Product added \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(product_code USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM product_master
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('product_updated' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('Product updated \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(product_code USING utf8mb4) COLLATE utf8mb4_general_ci,
               updated_date
        FROM product_master
        WHERE updated_date > created_date
        ORDER BY updated_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('customer_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New customer added \u2014 ', customer_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('#', id) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM customer_master
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT(action_type USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(description USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(reference_id USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_at
        FROM activity_log
        ORDER BY created_at DESC LIMIT 20
    )
    ORDER BY activity_time DESC
    LIMIT 20
`;

exports.getRecentActivity = (req, res) => {

    db.mainDb(
        RECENT_ACTIVITY_QUERY,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );

};

//-------------------------------------------------------------------
// Dashboard — real (non-mocked) stats, monthly graph data and enquiry
// previews. sample_enquiry has no status column (only per-step Yes/No
// flags), so it's counted toward the Total but deliberately excluded from
// Pending/Completed — it doesn't share the Pending / Mark as Done workflow
// the other three enquiry tables use, and guessing a mapping would
// misclassify its records.
//-------------------------------------------------------------------

function dbQueryAsync(query, values = []) {
    return new Promise((resolve, reject) => {
        db.mainDb(query, values, (err, result) => {
            if (err) reject(err); else resolve(result);
        });
    });
}

//-------------------------------------------------------------------
// Next-code suggestion (Category / Sub-Category / Product "Add" forms).
//
// Reads every existing code, ignores anything that doesn't look like
// "<letters><optional ->0-9+", and increments the numeric part of whichever
// row has the highest numeric value — not the row count, since deleted
// records or gaps would let count-based numbering collide with an existing
// code. The winning row's own prefix and zero-padding width are reused, so
// this adapts to whatever convention is actually stored (CAT-006, SUB014,
// PROD014, ...) instead of assuming a hardcoded format. The frontend only
// ever prefills a suggestion; create() still re-validates uniqueness so a
// race between two admins can't produce two rows with the same code.
const CODE_PATTERN = /^([A-Za-z]+-?)(\d+)$/;

function computeNextCode(codes, fallback) {
    let best = null;
    for (const raw of codes) {
        if (typeof raw !== 'string') continue;
        const m = raw.trim().match(CODE_PATTERN);
        if (!m) continue;
        const numeric = parseInt(m[2], 10);
        if (!best || numeric > best.numeric) {
            best = { prefix: m[1], digits: m[2].length, numeric };
        }
    }
    if (!best) return fallback;
    const nextNumeric = best.numeric + 1;
    const digits = Math.max(best.digits, String(nextNumeric).length);
    return `${best.prefix}${String(nextNumeric).padStart(digits, '0')}`;
}

exports.getNextCategoryCode = async (req, res) => {
    try {
        const rows = await dbQueryAsync(`SELECT category_code FROM category_master`);
        const code = computeNextCode(rows.map(r => r.category_code), 'CAT-001');
        return res.json({ status: 1, code });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getNextSubCategoryCode = async (req, res) => {
    try {
        const rows = await dbQueryAsync(`SELECT sub_category_code FROM sub_category_master`);
        const code = computeNextCode(rows.map(r => r.sub_category_code), 'SUB001');
        return res.json({ status: 1, code });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getNextProductCode = async (req, res) => {
    try {
        const rows = await dbQueryAsync(`SELECT product_code FROM product_master`);
        const code = computeNextCode(rows.map(r => r.product_code), 'PROD001');
        return res.json({ status: 1, code });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getNextOrderId = async (req, res) => {
    try {
        const rows = await dbQueryAsync(`SELECT order_id FROM order_tracking`);
        const code = computeNextCode(rows.map(r => r.order_id), 'ORD-001');
        return res.json({ status: 1, code });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

//-------------------------------------------------------------------
// Order Tracking — dynamic per-order milestone dates (order_dates /
// order_date_titles) instead of a fixed set of date columns.
//-------------------------------------------------------------------

// "Ship Cargo", "ship cargo" and "Ship  Cargo" must all resolve to the same
// title row — trim, collapse internal whitespace, lowercase, then join
// words with hyphens for a stable lookup/storage key.
function normaliseTitle(raw) {
    return String(raw || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/ /g, '-');
}

// Looks up an existing date title by its normalised form, creating one if
// this is the first time it's been used. The first admin to use a given
// title (in any casing/spacing) sets the "clean" display form everyone
// else reuses afterward — later variants never overwrite it.
async function findOrCreateDateTitle(txQuery, rawTitle) {
    const cleaned = String(rawTitle || '').trim().replace(/\s+/g, ' ');
    const normalised = normaliseTitle(cleaned);
    const existing = await txQuery(`SELECT id FROM order_date_titles WHERE normalised_name = ?`, [normalised]);
    if (existing.length > 0) return existing[0].id;
    const result = await txQuery(
        `INSERT INTO order_date_titles (display_name, normalised_name) VALUES (?, ?)`,
        [cleaned, normalised]
    );
    return result.insertId;
}

exports.getOrderDateTitles = async (req, res) => {
    try {
        const rows = await dbQueryAsync(
            `SELECT id, display_name, normalised_name FROM order_date_titles ORDER BY display_name`
        );
        return res.json({ status: 1, data: rows });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

// Validates and normalises the `dates` array shared by create/update:
// skips genuinely empty rows (never submitted), rejects a bad date value or
// a title reused twice within the same order. Returns either
// { dates: [...] } or { error: "message" }.
function prepareOrderDates(rawDates) {
    const list = Array.isArray(rawDates) ? rawDates : [];
    const seenNormalised = new Set();
    const dates = [];

    for (const d of list) {
        const title = String(d?.title || '').trim().replace(/\s+/g, ' ');
        const value = d?.value;
        if (!title && !value) continue; // untouched empty row — not submitted
        if (!title) return { error: "Each date entry needs a title." };
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
            return { error: `"${title}" needs a valid date.` };
        }
        const normalised = normaliseTitle(title);
        if (seenNormalised.has(normalised)) {
            return { error: `"${title}" was added more than once — each date title can only be used once per order.` };
        }
        seenNormalised.add(normalised);
        dates.push({ title, value, normalised });
    }

    return { dates };
}

exports.getDashboardStats = async (req, res) => {
    try {
        const [row] = await dbQueryAsync(`
            SELECT
                (SELECT COUNT(*) FROM get_enquire_quote) +
                (SELECT COUNT(*) FROM contact_us_enquiry) +
                (SELECT COUNT(*) FROM enquiries) +
                (SELECT COUNT(*) FROM sample_enquiry) AS total,

                (SELECT COUNT(*) FROM get_enquire_quote  WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM contact_us_enquiry WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM enquiries          WHERE status = 'Pending') AS pending,

                (SELECT COUNT(*) FROM get_enquire_quote  WHERE status = 'Mark as Done') +
                (SELECT COUNT(*) FROM contact_us_enquiry WHERE status = 'Mark as Done') +
                (SELECT COUNT(*) FROM enquiries          WHERE status = 'Mark as Done') AS completed
        `);

        return res.json({
            status: 1,
            data: {
                total:     Number(row.total)     || 0,
                pending:   Number(row.pending)   || 0,
                completed: Number(row.completed) || 0,
            }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_LOOKBACK = 6;

exports.getMonthlyEnquiries = async (req, res) => {
    try {
        const now = new Date();
        const months = [];
        for (let i = MONTHLY_LOOKBACK - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
            });
        }
        const startDate = `${months[0].key}-01`;

        const [quoteRows, contactRows, generalRows, sampleRows] = await Promise.all([
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM get_enquire_quote  WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM contact_us_enquiry WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM enquiries          WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_at,  '%Y-%m') AS ym, COUNT(*) AS cnt FROM sample_enquiry     WHERE created_at  >= ? GROUP BY ym`, [startDate]),
        ]);

        const toMap = (rows) => rows.reduce((acc, r) => { acc[r.ym] = Number(r.cnt); return acc; }, {});
        const quoteMap = toMap(quoteRows), contactMap = toMap(contactRows), generalMap = toMap(generalRows), sampleMap = toMap(sampleRows);

        const data = months.map(m => ({
            month:   m.label,
            general: generalMap[m.key] || 0,
            contact: contactMap[m.key] || 0,
            quote:   quoteMap[m.key]   || 0,
            sample:  sampleMap[m.key]  || 0,
        }));

        return res.json({ status: 1, data });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getLatestEnquiries = async (req, res) => {
    try {
        const [general, contact, quote] = await Promise.all([
            dbQueryAsync(`SELECT * FROM enquiries          ORDER BY created_date DESC LIMIT 2`),
            dbQueryAsync(`SELECT * FROM contact_us_enquiry ORDER BY created_date DESC LIMIT 2`),
            dbQueryAsync(`SELECT * FROM get_enquire_quote  ORDER BY created_date DESC LIMIT 2`),
        ]);

        return res.json({
            status: 1,
            data: { general, contact, quote }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

