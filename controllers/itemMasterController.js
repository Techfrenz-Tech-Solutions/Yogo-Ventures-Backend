const { Validator } = require("node-input-validator");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../models/db.js');
const { storageDir } = require('../helper/upload.js');
const quoteEmailService = require('../services/quoteEmailService.js');
const { buildSearchClause, combineClauses, buildWorkbook, buildExportFilename, sendWorkbook } = require('../helper/excelExport.js');

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

function normalizeOptionalStringField(reqData, fieldName) {
    const rawValue = reqData[fieldName];
    reqData[fieldName] = typeof rawValue === 'string' ? rawValue.trim() : '';
    return reqData[fieldName] || null;
}

exports.createCountry = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        country_code: 'required|string|maxLength:10',
        iso3:         'string|maxLength:3',
        country_name: 'required|string|maxLength:100',
        phone_code:   'required|string|maxLength:10',
        is_active:    'integer'
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
            (country_code, iso3, country_name, phone_code, is_active)
            VALUES (?, ?, ?, ?, ?)`;

        db.mainDb(
            insertQuery,
            [
                reqData.country_code,
                reqData.iso3 ? reqData.iso3.trim().toUpperCase() : null,
                reqData.country_name,
                reqData.phone_code.trim(),
                reqData.is_active != null ? reqData.is_active : 1
            ],
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
        iso3:         'string|maxLength:3',
        country_name: 'required|string|maxLength:100',
        phone_code:   'required|string|maxLength:10',
        is_active:    'integer'
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
            SET country_code = ?, iso3 = ?, country_name = ?, phone_code = ?, is_active = ?
            WHERE id = ?`;

        db.mainDb(
            updateQuery,
            [
                reqData.country_code,
                reqData.iso3 ? reqData.iso3.trim().toUpperCase() : null,
                reqData.country_name,
                reqData.phone_code.trim(),
                reqData.is_active != null ? reqData.is_active : 1,
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
            country_code,
            iso3,
            country_name,
            phone_code
        FROM country_master
        WHERE is_active = 1
        ORDER BY country_name ASC
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
    const subCategoryName = normalizeOptionalStringField(reqData, 'sub_category_name');

    const v = new Validator(reqData, {
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'string|maxLength:100',
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
                        subCategoryName,
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
    const subCategoryName = normalizeOptionalStringField(reqData, 'sub_category_name');

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'string|maxLength:100',
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
                        subCategoryName,
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
        // Color is optional — most products in the catalogue have no color
        // variant at all, so requiring it here rejected every quote for a
        // non-apparel product with a cryptic "color field is mandatory"
        // error (the actual root cause of quotes silently failing).
        color: 'string|maxLength:100',
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



// Matches the get_enquire_quote.status ENUM exactly ('Pending' / 'Mark as
// Done') — only these two values, and only the two reversible transitions
// between them, are accepted; anything else (an unsupported value, or
// Pending→Pending / Done→Done) is rejected before touching the row.
const QUOTE_STATUS_VALUES = ['Pending', 'Mark as Done'];

exports.updateEnquiryQuoteStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
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

        if (!QUOTE_STATUS_VALUES.includes(reqData.status)) {
            return res.json({
                status: 0,
                message: `Status must be one of: ${QUOTE_STATUS_VALUES.join(', ')}.`
            });
        }

        try {
            const rows = await dbQueryAsync(`SELECT status FROM get_enquire_quote WHERE id = ?`, [reqData.id]);
            if (rows.length === 0) {
                return res.json({ status: 0, message: "Enquiry Quote not found" });
            }

            const currentStatus = rows[0].status;
            const validTransition =
                (currentStatus === 'Pending' && reqData.status === 'Mark as Done') ||
                (currentStatus === 'Mark as Done' && reqData.status === 'Pending');

            if (!validTransition) {
                return res.json({
                    status: 0,
                    message: currentStatus === reqData.status
                        ? `Quote is already ${reqData.status}.`
                        : `Cannot change status from ${currentStatus} to ${reqData.status}.`
                });
            }

            await dbQueryAsync(`UPDATE get_enquire_quote SET status = ? WHERE id = ?`, [reqData.status, reqData.id]);
            const updatedRows = await dbQueryAsync(`SELECT updated_date FROM get_enquire_quote WHERE id = ?`, [reqData.id]);

            // `quote_status` (not `status`) at the top level — this API's
            // existing convention already uses `status` for the 0/1
            // success/failure envelope, so the quote's own status value
            // needs a distinct field name to avoid colliding with it.
            return res.json({
                status: 1,
                message: "Status updated successfully",
                id: reqData.id,
                quote_status: reqData.status,
                updated_date: updatedRows[0]?.updated_date || null,
            });
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

// Dedicated remarks-only endpoint — narrow (id + remarks only) so the admin
// panel's inline table input never has to resend the whole quote record,
// and never touches `status` (remarks and status update independently).
// Empty/whitespace-only input is stored as NULL rather than an empty
// string, matching "leave the field empty when no remark is needed".
exports.updateEnquiryQuoteRemarks = async (req, res) => {
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.json({ status: 0, message: "Invalid quote id." });
    }
    const rawRemarks = req.body?.remarks;
    if (rawRemarks !== undefined && rawRemarks !== null && typeof rawRemarks !== 'string') {
        return res.json({ status: 0, message: "Remarks must be text." });
    }
    const remarks = typeof rawRemarks === 'string' && rawRemarks.trim() !== '' ? rawRemarks.trim() : null;

    try {
        const rows = await dbQueryAsync(`SELECT id FROM get_enquire_quote WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Enquiry Quote not found" });
        }

        await dbQueryAsync(`UPDATE get_enquire_quote SET remarks = ? WHERE id = ?`, [remarks, id]);

        return res.json({
            status: 1,
            message: "Remarks updated successfully",
            id,
            remarks,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
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


const CONTACT_US_STATUS_VALUES = ['Pending', 'Mark as Done'];

// Two-way status endpoint — was previously a bare "set whatever string is
// sent" update with no whitelist, no existence check, and no transition
// guard (i.e. hardcoded in practice to only ever be called with "Mark as
// Done" by the frontend, with nothing stopping the reverse). Rebuilt to
// mirror updateEnquiryQuoteStatus's pattern exactly, since contact_us_enquiry
// uses the identical status ENUM('Pending','Mark as Done') as get_enquire_quote.
exports.updateContactUsStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
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

        if (!CONTACT_US_STATUS_VALUES.includes(reqData.status)) {
            return res.json({
                status: 0,
                message: `Status must be one of: ${CONTACT_US_STATUS_VALUES.join(', ')}.`
            });
        }

        try {
            const rows = await dbQueryAsync(`SELECT status FROM contact_us_enquiry WHERE id = ?`, [reqData.id]);
            if (rows.length === 0) {
                return res.json({ status: 0, message: "Contact enquiry not found" });
            }

            const currentStatus = rows[0].status;
            const validTransition =
                (currentStatus === 'Pending' && reqData.status === 'Mark as Done') ||
                (currentStatus === 'Mark as Done' && reqData.status === 'Pending');

            if (!validTransition) {
                return res.json({
                    status: 0,
                    message: currentStatus === reqData.status
                        ? `Contact enquiry is already ${reqData.status}.`
                        : `Cannot change status from ${currentStatus} to ${reqData.status}.`
                });
            }

            await dbQueryAsync(`UPDATE contact_us_enquiry SET status = ? WHERE id = ?`, [reqData.status, reqData.id]);
            const updatedRows = await dbQueryAsync(`SELECT updated_date FROM contact_us_enquiry WHERE id = ?`, [reqData.id]);

            // `contact_status` (not `status`) at the top level — this API's
            // existing convention already uses `status` for the 0/1
            // success/failure envelope, so the enquiry's own status value
            // needs a distinct field name to avoid colliding with it.
            return res.json({
                status: 1,
                message: "Status updated successfully",
                id: reqData.id,
                contact_status: reqData.status,
                updated_date: updatedRows[0]?.updated_date || null,
            });
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

// Dedicated remarks-only endpoint — narrow (id + remarks only), independent
// of `status`. Empty/whitespace-only input is stored as NULL.
exports.updateContactUsRemarks = async (req, res) => {
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.json({ status: 0, message: "Invalid contact enquiry id." });
    }
    const rawRemarks = req.body?.remarks;
    if (rawRemarks !== undefined && rawRemarks !== null && typeof rawRemarks !== 'string') {
        return res.json({ status: 0, message: "Remarks must be text." });
    }
    const remarks = typeof rawRemarks === 'string' && rawRemarks.trim() !== '' ? rawRemarks.trim() : null;

    try {
        const rows = await dbQueryAsync(`SELECT id FROM contact_us_enquiry WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Contact enquiry not found" });
        }

        await dbQueryAsync(`UPDATE contact_us_enquiry SET remarks = ? WHERE id = ?`, [remarks, id]);

        return res.json({
            status: 1,
            message: "Remarks updated successfully",
            id,
            remarks,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
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

// Dedicated remarks-only endpoint — narrow (id + remarks only), independent
// of `status`. Empty/whitespace-only input is stored as NULL.
exports.updateEnquiryRemarks = async (req, res) => {
    const id = Number(req.body?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.json({ status: 0, message: "Invalid enquiry id." });
    }
    const rawRemarks = req.body?.remarks;
    if (rawRemarks !== undefined && rawRemarks !== null && typeof rawRemarks !== 'string') {
        return res.json({ status: 0, message: "Remarks must be text." });
    }
    const remarks = typeof rawRemarks === 'string' && rawRemarks.trim() !== '' ? rawRemarks.trim() : null;

    try {
        const rows = await dbQueryAsync(`SELECT id FROM enquiries WHERE id = ?`, [id]);
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Enquiry not found" });
        }

        await dbQueryAsync(`UPDATE enquiries SET remarks = ? WHERE id = ?`, [remarks, id]);

        return res.json({
            status: 1,
            message: "Remarks updated successfully",
            id,
            remarks,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
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
        customer_id: 'required|integer'
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

        const { items, error: itemsError } = prepareOrderItems(reqData.items);
        if (itemsError) {
            return res.json({ status: 0, message: itemsError });
        }

        const { value: orderValue, error: valueError } = prepareOrderValue(reqData.order_value);
        if (valueError) {
            return res.json({ status: 0, message: valueError });
        }

        const { dates, error: datesError } = prepareOrderDates(reqData.dates);
        if (datesError) {
            return res.json({ status: 0, message: datesError });
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

            const productNameById = await lookupProductNames(items.map(i => i.product_id));
            if (!productNameById) {
                return res.json({ status: 0, message: "One or more selected products no longer exist." });
            }
            const legacySummary = summariseItemsForLegacyColumns(items, productNameById);

            const newId = await db.withTransaction(async (txQuery) => {
                const insertResult = await txQuery(
                    `INSERT INTO order_tracking (order_id, customer_id, product_name, quantity, order_value) VALUES (?, ?, ?, ?, ?)`,
                    [reqData.order_id, reqData.customer_id, legacySummary.productName, legacySummary.quantity, orderValue]
                );
                const orderTrackingId = insertResult.insertId;

                for (const item of items) {
                    await txQuery(
                        `INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)`,
                        [orderTrackingId, item.product_id, item.quantity]
                    );
                }

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
        // Optional ?order_id= filter — partial, case-insensitive match via a
        // parameterised LIKE (never string-concatenated into the query), so
        // API consumers that want server-side filtering can ask for it; the
        // admin panel currently filters the already-loaded list client-side
        // and doesn't pass this, but the endpoint supports it either way.
        const orderIdFilter = typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';
        const whereClause = orderIdFilter ? `WHERE order_id LIKE ?` : '';
        const params = orderIdFilter ? [`%${orderIdFilter}%`] : [];

        const orders = await dbQueryAsync(
            `SELECT id, order_id, customer_id, product_name, quantity, order_value, status, remarks, created_date, updated_date
             FROM order_tracking
             ${whereClause}
             ORDER BY id DESC`,
            params
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

        let itemsByOrder = {};
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const itemRows = await dbQueryAsync(
                `SELECT oi.order_id, oi.product_id, oi.quantity, pm.product_name, pm.product_code
                 FROM order_items oi
                 JOIN product_master pm ON pm.id = oi.product_id
                 WHERE oi.order_id IN (${placeholders})
                 ORDER BY oi.id`,
                orderIds
            );
            for (const row of itemRows) {
                (itemsByOrder[row.order_id] = itemsByOrder[row.order_id] || []).push({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    product_code: row.product_code,
                    quantity: row.quantity
                });
            }
        }

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
            // Legacy single-product columns — kept only as a fallback for a
            // pre-migration order with no order_items rows yet (its old
            // product_name didn't match any product_master row). Any order
            // with `items` populated should be displayed from `items`, not
            // these two fields.
            product_name: o.product_name,
            quantity: o.quantity,
            order_value: o.order_value !== null ? Number(o.order_value) : null,
            status: o.status,
            remarks: o.remarks,
            items: itemsByOrder[o.id] || [],
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
            `SELECT id, order_id, customer_id, product_name, quantity, order_value, status, created_date, updated_date FROM order_tracking WHERE id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Order Tracking not found" });
        }

        const itemRows = await dbQueryAsync(
            `SELECT oi.product_id, oi.quantity, pm.product_name, pm.product_code
             FROM order_items oi
             JOIN product_master pm ON pm.id = oi.product_id
             WHERE oi.order_id = ?
             ORDER BY oi.id`,
            [id]
        );

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
                order_value: rows[0].order_value !== null ? Number(rows[0].order_value) : null,
                customer_name: customerRows[0]?.customer_name || null,
                items: itemRows.map(r => ({
                    product_id: r.product_id,
                    product_name: r.product_name,
                    product_code: r.product_code,
                    quantity: r.quantity
                })),
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
        customer_id: 'required|integer'
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

        const { items, error: itemsError } = prepareOrderItems(reqData.items);
        if (itemsError) {
            return res.json({ status: 0, message: itemsError });
        }

        const { value: orderValue, error: valueError } = prepareOrderValue(reqData.order_value);
        if (valueError) {
            return res.json({ status: 0, message: valueError });
        }

        const { dates, error: datesError } = prepareOrderDates(reqData.dates);
        if (datesError) {
            return res.json({ status: 0, message: datesError });
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

            const productNameById = await lookupProductNames(items.map(i => i.product_id));
            if (!productNameById) {
                return res.json({ status: 0, message: "One or more selected products no longer exist." });
            }
            const legacySummary = summariseItemsForLegacyColumns(items, productNameById);

            await db.withTransaction(async (txQuery) => {
                const updateResult = await txQuery(
                    `UPDATE order_tracking SET order_id = ?, customer_id = ?, product_name = ?, quantity = ?, order_value = ? WHERE id = ?`,
                    [reqData.order_id, reqData.customer_id, legacySummary.productName, legacySummary.quantity, orderValue, reqData.id]
                );
                if (updateResult.affectedRows === 0) {
                    const notFound = new Error('Order Tracking not found');
                    notFound.isNotFound = true;
                    throw notFound;
                }

                // Replace order_items wholesale: drop any product the admin
                // removed from the form, then upsert every submitted row (an
                // unchanged product is simply re-written with the same
                // quantity — harmless, and keeps this branch simple).
                const existingItemRows = await txQuery(`SELECT product_id FROM order_items WHERE order_id = ?`, [reqData.id]);
                const submittedProductIds = new Set(items.map(i => i.product_id));
                for (const row of existingItemRows) {
                    if (!submittedProductIds.has(row.product_id)) {
                        await txQuery(`DELETE FROM order_items WHERE order_id = ? AND product_id = ?`, [reqData.id, row.product_id]);
                    }
                }
                for (const item of items) {
                    await txQuery(
                        `INSERT INTO order_items (order_id, product_id, quantity)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
                        [reqData.id, item.product_id, item.quantity]
                    );
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

// Order-level status only (never per order_item) — Pending / Processing /
// Delivered, set from the row buttons on the Order Tracking table. Kept as
// its own endpoint separate from updateOrderTracking so a status click
// never has to resend (and risk overwriting) the order's items/dates/value.
const ORDER_STATUS_VALUES = ['pending', 'processing', 'delivered'];
const ORDER_STATUS_LABELS = { pending: 'Pending', processing: 'Processing', delivered: 'Delivered' };

exports.updateOrderTrackingStatus = async (req, res) => {
    const id = Number(req.params.id);
    const rawStatus = String(req.body?.status || '').trim().toLowerCase();

    if (!Number.isInteger(id) || id <= 0) {
        return res.json({ status: 0, message: "Invalid order id." });
    }
    if (!ORDER_STATUS_VALUES.includes(rawStatus)) {
        return res.json({ status: 0, message: `Status must be one of: ${ORDER_STATUS_VALUES.join(', ')}.` });
    }

    try {
        // affectedRows === 0 after the UPDATE means no row matched this id —
        // the same "confirm it exists" check used by deleteOrderTracking,
        // just via the write itself rather than a separate SELECT first.
        const result = await dbQueryAsync(
            `UPDATE order_tracking SET status = ? WHERE id = ?`,
            [rawStatus, id]
        );
        if (result.affectedRows === 0) {
            return res.json({ status: 0, message: "Order Tracking not found" });
        }

        const rows = await dbQueryAsync(`SELECT updated_date FROM order_tracking WHERE id = ?`, [id]);

        // `order_status` (not `status`) at the top level — this API's
        // existing convention already uses `status` for the 0/1
        // success/failure envelope, so the order's own status value needs
        // a distinct field name to avoid colliding with it.
        return res.json({
            status: 1,
            message: "Order status updated successfully",
            id,
            order_status: rawStatus,
            updated_date: rows[0]?.updated_date || null,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

// Dedicated remarks-only endpoint — narrow (id from the URL + remarks in
// the body only), independent of `status`/courier/date fields. Empty or
// whitespace-only input is stored as NULL.
exports.updateOrderTrackingRemarks = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.json({ status: 0, message: "Invalid order id." });
    }
    const rawRemarks = req.body?.remarks;
    if (rawRemarks !== undefined && rawRemarks !== null && typeof rawRemarks !== 'string') {
        return res.json({ status: 0, message: "Remarks must be text." });
    }
    const remarks = typeof rawRemarks === 'string' && rawRemarks.trim() !== '' ? rawRemarks.trim() : null;

    try {
        const result = await dbQueryAsync(
            `UPDATE order_tracking SET remarks = ? WHERE id = ?`,
            [remarks, id]
        );
        if (result.affectedRows === 0) {
            return res.json({ status: 0, message: "Order Tracking not found" });
        }

        return res.json({
            status: 1,
            message: "Remarks updated successfully",
            id,
            remarks,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
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


const SAMPLE_ENQUIRY_STATUS_VALUES = ['pending', 'done'];

// Dedicated status-only endpoint — deliberately narrow (enquiry_id + status
// only) instead of reusing updateSampleEnquiry's full-record update, which
// required every other field (customer_id, enquired_on, product_name, etc.)
// to still be valid just to flip a workflow flag. Mirrors the pattern
// already used for get_enquire_quote.status / order_tracking.status.
exports.updateSampleEnquiryStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        enquiry_id: 'required|integer',
        status: 'required|string'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ status: 0, message: error_message });
        }

        const newStatus = String(reqData.status).trim().toLowerCase();

        if (!SAMPLE_ENQUIRY_STATUS_VALUES.includes(newStatus)) {
            return res.json({
                status: 0,
                message: `Status must be one of: ${SAMPLE_ENQUIRY_STATUS_VALUES.join(', ')}.`
            });
        }

        try {
            const rows = await dbQueryAsync(`SELECT status FROM sample_enquiry WHERE enquiry_id = ?`, [reqData.enquiry_id]);
            if (rows.length === 0) {
                return res.json({ status: 0, message: "Sample enquiry not found" });
            }

            const currentStatus = rows[0].status;
            const validTransition =
                (currentStatus === 'pending' && newStatus === 'done') ||
                (currentStatus === 'done' && newStatus === 'pending');

            if (!validTransition) {
                return res.json({
                    status: 0,
                    message: currentStatus === newStatus
                        ? `Sample enquiry is already ${newStatus}.`
                        : `Cannot change status from ${currentStatus} to ${newStatus}.`
                });
            }

            await dbQueryAsync(`UPDATE sample_enquiry SET status = ? WHERE enquiry_id = ?`, [newStatus, reqData.enquiry_id]);
            const updatedRows = await dbQueryAsync(`SELECT updated_at FROM sample_enquiry WHERE enquiry_id = ?`, [reqData.enquiry_id]);

            // `sample_status` (not `status`) at the top level — this API's
            // existing convention already uses `status` for the 0/1
            // success/failure envelope, so the enquiry's own status value
            // needs a distinct field name to avoid colliding with it.
            return res.json({
                status: 1,
                message: "Status updated successfully",
                enquiry_id: reqData.enquiry_id,
                sample_status: newStatus,
                updated_at: updatedRows[0]?.updated_at || null,
            });
        } catch (err) {
            return res.json({ status: 0, message: "DB error" });
        }
    });
};

// Dedicated remarks-only endpoint — narrow (enquiry_id + remarks only),
// independent of `status`. Empty/whitespace-only input is stored as NULL.
// Keyed by enquiry_id, this table's actual primary key (not an "id" column).
exports.updateSampleEnquiryRemarks = async (req, res) => {
    const enquiryId = Number(req.body?.enquiry_id);
    if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        return res.json({ status: 0, message: "Invalid sample enquiry id." });
    }
    const rawRemarks = req.body?.remarks;
    if (rawRemarks !== undefined && rawRemarks !== null && typeof rawRemarks !== 'string') {
        return res.json({ status: 0, message: "Remarks must be text." });
    }
    const remarks = typeof rawRemarks === 'string' && rawRemarks.trim() !== '' ? rawRemarks.trim() : null;

    try {
        const rows = await dbQueryAsync(`SELECT enquiry_id FROM sample_enquiry WHERE enquiry_id = ?`, [enquiryId]);
        if (rows.length === 0) {
            return res.json({ status: 0, message: "Sample enquiry not found" });
        }

        await dbQueryAsync(`UPDATE sample_enquiry SET remarks = ? WHERE enquiry_id = ?`, [remarks, enquiryId]);

        return res.json({
            status: 1,
            message: "Remarks updated successfully",
            enquiry_id: enquiryId,
            remarks,
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
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

function escapeLikeTerm(raw) {
    return String(raw || '').replace(/[\\%_]/g, '\\$&');
}

function adminSearchRoute(path, id) {
    return `${path}?highlight=${encodeURIComponent(String(id))}`;
}

function normaliseSearchRow(row) {
    return {
        id: `${row.result_type}-${row.record_id}-${row.matched_value || row.title || ''}`,
        type: row.result_type,
        matched_value: row.matched_value || '',
        description: row.description || '',
        page: row.page,
        path: row.path,
        record_id: row.record_id,
        highlight: row.highlight_id,
        route: adminSearchRoute(row.path, row.highlight_id),
    };
}

async function runGlobalSearchQuery(query, params, typeLimit) {
    return dbQueryAsync(`${query} LIMIT ?`, [...params, typeLimit]);
}

exports.globalSearch = async (req, res) => {
    const rawQuery = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (rawQuery.length < 2) {
        return res.json({ status: 1, data: [] });
    }

    const perTypeLimit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 6, 1), 10);
    const like = `%${escapeLikeTerm(rawQuery)}%`;

    try {
        const searches = [
            runGlobalSearchQuery(`
                SELECT DISTINCT
                    'Product' AS result_type,
                    p.id AS record_id,
                    p.id AS highlight_id,
                    '/product-master' AS path,
                    'Product Master' AS page,
                    CASE
                        WHEN CAST(p.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(p.id AS CHAR)
                        WHEN p.product_code LIKE ? ESCAPE '\\\\' THEN p.product_code
                        WHEN p.product_name LIKE ? ESCAPE '\\\\' THEN p.product_name
                        WHEN p.category_name LIKE ? ESCAPE '\\\\' THEN p.category_name
                        ELSE COALESCE(p.sub_category_name, '')
                    END AS matched_value,
                    CONCAT_WS(' · ', p.product_code, p.product_name, p.category_name, NULLIF(p.sub_category_name, '')) AS description
                FROM product_master p
                WHERE CAST(p.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR p.product_code LIKE ? ESCAPE '\\\\'
                   OR p.product_name LIKE ? ESCAPE '\\\\'
                   OR p.category_name LIKE ? ESCAPE '\\\\'
                   OR p.sub_category_name LIKE ? ESCAPE '\\\\'
                ORDER BY p.id DESC
            `, [like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT
                    'Customer' AS result_type,
                    c.id AS record_id,
                    c.id AS highlight_id,
                    '/customer-master' AS path,
                    'Customer Master' AS page,
                    CASE
                        WHEN CAST(c.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(c.id AS CHAR)
                        WHEN c.customer_name LIKE ? ESCAPE '\\\\' THEN c.customer_name
                        WHEN c.email_id LIKE ? ESCAPE '\\\\' THEN c.email_id
                        WHEN c.phone_number LIKE ? ESCAPE '\\\\' THEN c.phone_number
                        ELSE c.country
                    END AS matched_value,
                    CONCAT_WS(' · ', CONCAT('Customer #', c.id), c.customer_name, c.email_id, c.phone_number) AS description
                FROM customer_master c
                WHERE CAST(c.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR c.customer_name LIKE ? ESCAPE '\\\\'
                   OR c.email_id LIKE ? ESCAPE '\\\\'
                   OR c.phone_number LIKE ? ESCAPE '\\\\'
                   OR c.country LIKE ? ESCAPE '\\\\'
                ORDER BY c.id DESC
            `, [like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT DISTINCT
                    'Order' AS result_type,
                    ot.id AS record_id,
                    ot.id AS highlight_id,
                    '/order-tracking' AS path,
                    'Order Tracking' AS page,
                    CASE
                        WHEN CAST(ot.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(ot.id AS CHAR)
                        WHEN ot.order_id LIKE ? ESCAPE '\\\\' THEN ot.order_id
                        WHEN CAST(ot.customer_id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(ot.customer_id AS CHAR)
                        WHEN cm.customer_name LIKE ? ESCAPE '\\\\' THEN cm.customer_name
                        WHEN pm.product_code LIKE ? ESCAPE '\\\\' THEN pm.product_code
                        ELSE COALESCE(pm.product_name, ot.product_name, '')
                    END AS matched_value,
                    CONCAT_WS(' · ', ot.order_id, CONCAT('Customer #', ot.customer_id), cm.customer_name, COALESCE(pm.product_name, ot.product_name), ot.status) AS description
                FROM order_tracking ot
                LEFT JOIN customer_master cm ON cm.id = ot.customer_id
                LEFT JOIN order_items oi ON oi.order_id = ot.id
                LEFT JOIN product_master pm ON pm.id = oi.product_id
                WHERE CAST(ot.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR ot.order_id LIKE ? ESCAPE '\\\\'
                   OR CAST(ot.customer_id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR cm.customer_name LIKE ? ESCAPE '\\\\'
                   OR cm.email_id LIKE ? ESCAPE '\\\\'
                   OR cm.phone_number LIKE ? ESCAPE '\\\\'
                   OR pm.product_name LIKE ? ESCAPE '\\\\'
                   OR pm.product_code LIKE ? ESCAPE '\\\\'
                   OR ot.product_name LIKE ? ESCAPE '\\\\'
                ORDER BY ot.id DESC
            `, [like, like, like, like, like, like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT
                    'Quote' AS result_type,
                    q.id AS record_id,
                    q.id AS highlight_id,
                    '/quote-enquiries' AS path,
                    'Quote Enquiries' AS page,
                    CASE
                        WHEN q.reference_number LIKE ? ESCAPE '\\\\' THEN q.reference_number
                        WHEN CAST(q.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(q.id AS CHAR)
                        WHEN q.product_name LIKE ? ESCAPE '\\\\' THEN q.product_name
                        WHEN CONCAT_WS(' ', q.first_name, q.last_name) LIKE ? ESCAPE '\\\\' THEN CONCAT_WS(' ', q.first_name, q.last_name)
                        WHEN q.email_id LIKE ? ESCAPE '\\\\' THEN q.email_id
                        ELSE q.phone_number
                    END AS matched_value,
                    CONCAT_WS(' · ', COALESCE(q.reference_number, CONCAT('Quote #', q.id)), CONCAT_WS(' ', q.first_name, q.last_name), q.email_id, q.product_name, q.status) AS description
                FROM get_enquire_quote q
                WHERE q.reference_number LIKE ? ESCAPE '\\\\'
                   OR CAST(q.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR q.product_name LIKE ? ESCAPE '\\\\'
                   OR CONCAT_WS(' ', q.first_name, q.last_name) LIKE ? ESCAPE '\\\\'
                   OR q.email_id LIKE ? ESCAPE '\\\\'
                   OR q.phone_number LIKE ? ESCAPE '\\\\'
                   OR q.country LIKE ? ESCAPE '\\\\'
                   OR q.items_json LIKE ? ESCAPE '\\\\'
                ORDER BY q.id DESC
            `, [like, like, like, like, like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT
                    'Contact Enquiry' AS result_type,
                    c.id AS record_id,
                    c.id AS highlight_id,
                    '/contact-enquiries' AS path,
                    'Contact Enquiries' AS page,
                    CASE
                        WHEN c.reference_number LIKE ? ESCAPE '\\\\' THEN c.reference_number
                        WHEN CAST(c.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(c.id AS CHAR)
                        WHEN CONCAT_WS(' ', c.first_name, c.last_name) LIKE ? ESCAPE '\\\\' THEN CONCAT_WS(' ', c.first_name, c.last_name)
                        WHEN c.email_id LIKE ? ESCAPE '\\\\' THEN c.email_id
                        WHEN c.phone_number LIKE ? ESCAPE '\\\\' THEN c.phone_number
                        ELSE c.subject
                    END AS matched_value,
                    CONCAT_WS(' · ', COALESCE(c.reference_number, CONCAT('Contact #', c.id)), CONCAT_WS(' ', c.first_name, c.last_name), c.email_id, c.subject, c.status) AS description
                FROM contact_us_enquiry c
                WHERE c.reference_number LIKE ? ESCAPE '\\\\'
                   OR CAST(c.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR CONCAT_WS(' ', c.first_name, c.last_name) LIKE ? ESCAPE '\\\\'
                   OR c.email_id LIKE ? ESCAPE '\\\\'
                   OR c.phone_number LIKE ? ESCAPE '\\\\'
                   OR c.country LIKE ? ESCAPE '\\\\'
                   OR c.subject LIKE ? ESCAPE '\\\\'
                ORDER BY c.id DESC
            `, [like, like, like, like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT
                    'General Enquiry' AS result_type,
                    e.id AS record_id,
                    e.id AS highlight_id,
                    '/general-enquiries' AS path,
                    'General Enquiries' AS page,
                    CASE
                        WHEN e.reference_number LIKE ? ESCAPE '\\\\' THEN e.reference_number
                        WHEN CAST(e.id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(e.id AS CHAR)
                        WHEN CONCAT_WS(' ', e.first_name, e.last_name) LIKE ? ESCAPE '\\\\' THEN CONCAT_WS(' ', e.first_name, e.last_name)
                        WHEN e.email_id LIKE ? ESCAPE '\\\\' THEN e.email_id
                        WHEN e.phone_number LIKE ? ESCAPE '\\\\' THEN e.phone_number
                        ELSE e.product_category
                    END AS matched_value,
                    CONCAT_WS(' · ', COALESCE(e.reference_number, CONCAT('Enquiry #', e.id)), CONCAT_WS(' ', e.first_name, e.last_name), e.email_id, e.product_category, e.status) AS description
                FROM enquiries e
                WHERE e.reference_number LIKE ? ESCAPE '\\\\'
                   OR CAST(e.id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR CONCAT_WS(' ', e.first_name, e.last_name) LIKE ? ESCAPE '\\\\'
                   OR e.email_id LIKE ? ESCAPE '\\\\'
                   OR e.phone_number LIKE ? ESCAPE '\\\\'
                   OR e.country LIKE ? ESCAPE '\\\\'
                   OR e.product_category LIKE ? ESCAPE '\\\\'
                ORDER BY e.id DESC
            `, [like, like, like, like, like, like, like, like, like, like, like, like], perTypeLimit),

            runGlobalSearchQuery(`
                SELECT
                    'Sample Enquiry' AS result_type,
                    se.enquiry_id AS record_id,
                    se.enquiry_id AS highlight_id,
                    '/sample-enquiries' AS path,
                    'Sample Enquiries' AS page,
                    CASE
                        WHEN CAST(se.enquiry_id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(se.enquiry_id AS CHAR)
                        WHEN CAST(se.customer_id AS CHAR) LIKE ? ESCAPE '\\\\' THEN CAST(se.customer_id AS CHAR)
                        WHEN cm.customer_name LIKE ? ESCAPE '\\\\' THEN cm.customer_name
                        WHEN cm.email_id LIKE ? ESCAPE '\\\\' THEN cm.email_id
                        WHEN cm.phone_number LIKE ? ESCAPE '\\\\' THEN cm.phone_number
                        ELSE se.product_name
                    END AS matched_value,
                    CONCAT_WS(' · ', CONCAT('Sample #', se.enquiry_id), CONCAT('Customer #', se.customer_id), cm.customer_name, cm.email_id, se.product_name, se.status) AS description
                FROM sample_enquiry se
                LEFT JOIN customer_master cm ON cm.id = se.customer_id
                WHERE CAST(se.enquiry_id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR CAST(se.customer_id AS CHAR) LIKE ? ESCAPE '\\\\'
                   OR cm.customer_name LIKE ? ESCAPE '\\\\'
                   OR cm.email_id LIKE ? ESCAPE '\\\\'
                   OR cm.phone_number LIKE ? ESCAPE '\\\\'
                   OR se.product_name LIKE ? ESCAPE '\\\\'
                ORDER BY se.enquiry_id DESC
            `, [like, like, like, like, like, like, like, like, like, like, like], perTypeLimit),
        ];

        const grouped = await Promise.all(searches);
        const seenRecords = new Set();
        const rows = grouped.flat().filter(row => {
            const key = `${row.result_type}:${row.record_id}`;
            if (seenRecords.has(key)) return false;
            seenRecords.add(key);
            return true;
        });
        const data = rows.slice(0, 40).map(normaliseSearchRow);
        return res.json({ status: 1, data });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

// Validates and normalises the `dates` array shared by create/update:
// skips genuinely empty rows (never submitted), rejects a bad date value or
// a title reused twice within the same order. Returns either
// { dates: [...] } or { error: "message" }.
// Validates and normalises the `items` array shared by create/update:
// requires at least one non-empty row, rejects a missing/invalid
// product_id or non-positive-integer quantity, and rejects the same
// product_id used twice in one order — order_items has a UNIQUE(order_id,
// product_id) constraint, so silently merging duplicates would hide a
// mistake from the admin instead of surfacing it.
function prepareOrderItems(rawItems) {
    const list = Array.isArray(rawItems) ? rawItems : [];
    const seenProductIds = new Set();
    const items = [];

    for (const raw of list) {
        const productId = raw?.product_id;
        const quantity = raw?.quantity;
        const productIdBlank = productId === undefined || productId === null || productId === '';
        const quantityBlank = quantity === undefined || quantity === null || quantity === '';
        if (productIdBlank && quantityBlank) continue; // untouched empty row — not submitted

        const productIdNum = Number(productId);
        if (productIdBlank || !Number.isInteger(productIdNum) || productIdNum <= 0) {
            return { error: "Each product row needs a product selected." };
        }
        const quantityNum = Number(quantity);
        if (quantityBlank || !Number.isInteger(quantityNum) || quantityNum <= 0) {
            return { error: "Each product's quantity must be a positive whole number." };
        }
        if (seenProductIds.has(productIdNum)) {
            return { error: "The same product was added more than once — each product can only appear once per order." };
        }
        seenProductIds.add(productIdNum);
        items.push({ product_id: productIdNum, quantity: quantityNum });
    }

    if (items.length === 0) {
        return { error: "At least one product is required." };
    }

    return { items };
}

// Order Value is optional (NULL until an admin fills it in) but when
// provided must be a non-negative number — negative values or non-numeric
// input are rejected outright rather than silently coerced.
function prepareOrderValue(raw) {
    if (raw === undefined || raw === null || raw === '') return { value: null };
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
        return { error: "Order Value must be a non-negative number." };
    }
    return { value: Math.round(num * 100) / 100 };
}

// Batch-checks that every product_id in an order's items still exists in
// product_master, returning a { id: product_name } map for the legacy
// summary columns — or null if any product_id no longer exists.
async function lookupProductNames(productIds) {
    if (productIds.length === 0) return {};
    const placeholders = productIds.map(() => '?').join(',');
    const rows = await dbQueryAsync(`SELECT id, product_name FROM product_master WHERE id IN (${placeholders})`, productIds);
    if (rows.length !== new Set(productIds).size) return null;
    return Object.fromEntries(rows.map(r => [r.id, r.product_name]));
}

// order_tracking.product_name/quantity are legacy single-product columns
// kept in place (not dropped) for backward compatibility — see migration
// 011. They're refreshed with a best-effort summary (first product's name,
// "+N more" if there are others; quantity = sum across items) purely so
// any old code path that still reads those two columns directly doesn't
// see stale/blank data. order_items is the real source of truth for
// anything item-level; the table/API responses read from there, not here.
function summariseItemsForLegacyColumns(items, productNameById) {
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const firstName = productNameById[items[0].product_id] || '';
    const productName = items.length > 1 ? `${firstName} +${items.length - 1} more` : firstName;
    return { productName, quantity: totalQuantity };
}

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

//-----------------------------------------------------------------------------
// Excel (.xlsx) exports — /quote-enquiries, /contact-enquiries,
// /general-enquiries, /customer-master, /order-tracking.
//
// Each export mirrors the exact filter predicate its admin page already
// applies client-side to the fully-loaded list (these pages have no
// server-side pagination — every list endpoint already returns the whole
// table), so the exported rows always match what's on screen. Any filter
// value that reaches SQL goes through a parameterised placeholder via
// buildSearchClause/combineClauses — never string-concatenated.
//-----------------------------------------------------------------------------

// A quote enquiry's products are either a JSON cart (items_json, from the
// website's multi-item quote flow) or the single legacy product_name/qty/
// color triplet — this mirrors the same "richer source wins, else fall
// back" logic ViewModal-equivalents use elsewhere in this file.
function summariseQuoteItems(row) {
    let items = [];
    if (row.items_json) {
        try {
            const parsed = JSON.parse(row.items_json);
            if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
        } catch (e) { /* malformed JSON — fall through to the legacy fields */ }
    }
    if (items.length === 0) {
        return row.product_name ? `${row.product_name} x ${row.qty}${row.color ? ` (${row.color})` : ''}` : '';
    }
    return items
        .map(it => `${it.product_name || 'Unknown'} x ${it.quantity ?? '?'}${it.color ? ` (${it.color})` : ''}`)
        .join('; ');
}

exports.exportEnquiryQuotes = async (req, res) => {
    try {
        const search = req.query.search || '';
        const { where, params } = combineClauses([
            buildSearchClause(['product_name', 'first_name', 'last_name', 'email_id', 'country', 'color'], search),
        ]);

        const rows = await dbQueryAsync(
            `SELECT * FROM get_enquire_quote ${where} ORDER BY id ASC`,
            params
        );

        const columns = [
            { header: 'Quote ID',       key: 'quoteId',      type: 'text' },
            { header: 'Customer Name',  key: 'customerName', type: 'text' },
            { header: 'Email',          key: 'email',        type: 'text' },
            { header: 'Phone Number',   key: 'phone',        type: 'text' },
            { header: 'Country',        key: 'country',      type: 'text' },
            { header: 'Products/Items', key: 'items',        type: 'text', width: 40 },
            { header: 'Message',        key: 'message',      type: 'text', width: 40 },
            { header: 'Status',         key: 'status',       type: 'text' },
            { header: 'Submitted Date', key: 'submitted',    type: 'date' },
        ];

        const data = rows.map(r => ({
            quoteId: r.reference_number || `#${r.id}`,
            customerName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            email: r.email_id,
            phone: r.phone_number,
            country: r.country,
            items: summariseQuoteItems(r),
            message: r.message,
            status: r.status,
            submitted: r.created_date,
        }));

        const workbook = buildWorkbook({ sheetName: 'Quote Enquiries', columns, rows: data });
        await sendWorkbook(res, workbook, buildExportFilename('quote-enquiries'));
    } catch (err) {
        return res.json({ status: 0, message: "Failed to generate export" });
    }
};

exports.exportContactUsList = async (req, res) => {
    try {
        const search = req.query.search || '';
        const { where, params } = combineClauses([
            buildSearchClause(['first_name', 'last_name', 'email_id', 'country', 'phone_number', 'subject'], search),
        ]);

        const rows = await dbQueryAsync(
            `SELECT * FROM contact_us_enquiry ${where} ORDER BY id ASC`,
            params
        );

        const columns = [
            { header: 'Contact Request ID', key: 'requestId',    type: 'text' },
            { header: 'Customer Name',      key: 'customerName', type: 'text' },
            { header: 'Email',              key: 'email',        type: 'text' },
            { header: 'Phone Number',       key: 'phone',        type: 'text' },
            { header: 'Country',            key: 'country',      type: 'text' },
            { header: 'Subject',            key: 'subject',      type: 'text', width: 28 },
            { header: 'Message',            key: 'message',      type: 'text', width: 40 },
            { header: 'Status',             key: 'status',       type: 'text' },
            { header: 'Submitted Date',     key: 'submitted',    type: 'date' },
        ];

        const data = rows.map(r => ({
            requestId: r.reference_number || `#${r.id}`,
            customerName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            email: r.email_id,
            phone: r.phone_number,
            country: r.country,
            subject: r.subject,
            message: r.message,
            status: r.status,
            submitted: r.created_date,
        }));

        const workbook = buildWorkbook({ sheetName: 'Contact Enquiries', columns, rows: data });
        await sendWorkbook(res, workbook, buildExportFilename('contact-enquiries'));
    } catch (err) {
        return res.json({ status: 0, message: "Failed to generate export" });
    }
};

exports.exportEnquiries = async (req, res) => {
    try {
        const search = req.query.search || '';
        const { where, params } = combineClauses([
            buildSearchClause(['first_name', 'last_name', 'email_id', 'country', 'phone_number', 'product_category'], search),
        ]);

        const rows = await dbQueryAsync(
            `SELECT * FROM enquiries ${where} ORDER BY id ASC`,
            params
        );

        const columns = [
            { header: 'Enquiry ID',        key: 'enquiryId',    type: 'text' },
            { header: 'Customer Name',     key: 'customerName', type: 'text' },
            { header: 'Email',             key: 'email',        type: 'text' },
            { header: 'Phone Number',      key: 'phone',        type: 'text' },
            { header: 'Country',           key: 'country',      type: 'text' },
            { header: 'Product Category',  key: 'category',     type: 'text' },
            { header: 'Message',           key: 'message',      type: 'text', width: 40 },
            { header: 'Status',            key: 'status',       type: 'text' },
            { header: 'Submitted Date',    key: 'submitted',    type: 'date' },
        ];

        const data = rows.map(r => ({
            enquiryId: r.reference_number || `#${r.id}`,
            customerName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
            email: r.email_id,
            phone: r.phone_number,
            country: r.country,
            category: r.product_category,
            message: r.message,
            status: r.status,
            submitted: r.created_date,
        }));

        const workbook = buildWorkbook({ sheetName: 'General Enquiries', columns, rows: data });
        await sendWorkbook(res, workbook, buildExportFilename('general-enquiries'));
    } catch (err) {
        return res.json({ status: 0, message: "Failed to generate export" });
    }
};

exports.exportCustomers = async (req, res) => {
    try {
        const search = req.query.search || '';
        const { where, params } = combineClauses([
            buildSearchClause(['customer_name', 'email_id', 'country', 'phone_number'], search),
        ]);

        const rows = await dbQueryAsync(
            `SELECT * FROM customer_master ${where} ORDER BY id ASC`,
            params
        );

        const columns = [
            { header: 'Customer ID',   key: 'customerId', type: 'text' },
            { header: 'Customer Name', key: 'name',        type: 'text' },
            { header: 'Email',         key: 'email',       type: 'text' },
            { header: 'Phone Number',  key: 'phone',       type: 'text' },
            { header: 'Country',       key: 'country',     type: 'text' },
            { header: 'Created Date',  key: 'created',     type: 'date' },
            { header: 'Updated Date',  key: 'updated',     type: 'date' },
        ];

        const data = rows.map(r => ({
            // Matches the table's own fallback (CustomerMaster.jsx): the
            // real database id, not a "#"-prefixed label, when the
            // human-assigned customer_id field is blank.
            customerId: (r.customer_id && r.customer_id.trim()) || String(r.id),
            name: r.customer_name,
            email: r.email_id,
            phone: r.phone_number,
            country: r.country,
            created: r.created_date,
            updated: r.updated_date,
        }));

        const workbook = buildWorkbook({ sheetName: 'Customers', columns, rows: data });
        await sendWorkbook(res, workbook, buildExportFilename('customers'));
    } catch (err) {
        return res.json({ status: 0, message: "Failed to generate export" });
    }
};

exports.exportOrderTracking = async (req, res) => {
    try {
        const search        = (req.query.search || '').trim().toLowerCase();
        const fromDate       = (req.query.from_date || '').trim();
        const toDate         = (req.query.to_date || '').trim();
        const orderIdFilter  = (req.query.order_id || '').trim();
        const customerFilter = (req.query.customer_id || '').trim().toLowerCase();
        const productFilter  = (req.query.product_name || '').trim();
        const statusFilter   = (req.query.status || '').trim().toLowerCase();

        // Order ID and status both map directly to indexed/exact columns,
        // so they're the two pushed into SQL; the rest (customer id-or-
        // name, product name, date range against dynamic dates, free-text
        // search) need the items/dates/customer-name join already
        // assembled below, so they're applied in JS afterward — exactly
        // mirroring the admin page's own client-side filters.
        const { where, params } = combineClauses([
            buildSearchClause(['order_id'], orderIdFilter),
            ORDER_STATUS_VALUES.includes(statusFilter)
                ? { clause: 'status = ?', params: [statusFilter] }
                : { clause: '', params: [] },
        ]);

        const orders = await dbQueryAsync(
            `SELECT id, order_id, customer_id, product_name, quantity, order_value, status, created_date, updated_date
             FROM order_tracking
             ${where}
             ORDER BY id DESC`,
            params
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

        let itemsByOrder = {};
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const itemRows = await dbQueryAsync(
                `SELECT oi.order_id, oi.product_id, oi.quantity, pm.product_name
                 FROM order_items oi
                 JOIN product_master pm ON pm.id = oi.product_id
                 WHERE oi.order_id IN (${placeholders})
                 ORDER BY oi.id`,
                orderIds
            );
            for (const row of itemRows) {
                (itemsByOrder[row.order_id] = itemsByOrder[row.order_id] || []).push({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                });
            }
        }

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
                    value: row.date_value,
                });
            }
        }

        const getItems = (o) => (
            itemsByOrder[o.id]?.length ? itemsByOrder[o.id] : (
                o.product_name ? [{ product_id: null, product_name: o.product_name, quantity: o.quantity }] : []
            )
        );

        let assembled = orders.map(o => ({
            ...o,
            customer_name: customerById[o.customer_id] || null,
            items: getItems(o),
            dates: datesByOrder[o.id] || [],
        }));

        if (search) {
            assembled = assembled.filter(o =>
                (o.order_id || '').toLowerCase().includes(search) ||
                String(o.customer_id || '').toLowerCase().includes(search) ||
                (o.customer_name || '').toLowerCase().includes(search) ||
                o.items.some(it => (it.product_name || '').toLowerCase().includes(search))
            );
        }
        if (fromDate || toDate) {
            assembled = assembled.filter(o => {
                const values = o.dates.map(d => String(d.value).slice(0, 10));
                if (values.length === 0) return false;
                return values.some(v => (!fromDate || v >= fromDate) && (!toDate || v <= toDate));
            });
        }
        if (customerFilter) {
            assembled = assembled.filter(o =>
                String(o.customer_id || '').toLowerCase().includes(customerFilter) ||
                (o.customer_name || '').toLowerCase().includes(customerFilter)
            );
        }
        if (productFilter) {
            assembled = assembled.filter(o => o.items.some(it => it.product_name === productFilter));
        }

        // Dynamic date columns — union of every title actually present
        // among the filtered rows, so the export only gets columns that
        // have at least one value in the exported result set.
        const dateTitleMap = new Map();
        assembled.forEach(o => o.dates.forEach(d => {
            if (!dateTitleMap.has(d.normalisedTitle)) dateTitleMap.set(d.normalisedTitle, d.title);
        }));
        const dateColumns = Array.from(dateTitleMap, ([key, title]) => ({ key, title }))
            .sort((a, b) => a.title.localeCompare(b.title));

        const columns = [
            { header: 'Order ID',      key: 'orderId',      type: 'text' },
            { header: 'Customer ID',   key: 'customerId',   type: 'text' },
            { header: 'Customer Name', key: 'customerName', type: 'text' },
            { header: 'Product Name',  key: 'productName',  type: 'text', width: 36, wrap: true },
            { header: 'Quantity',      key: 'quantity',     type: 'text', width: 14, wrap: true },
            { header: 'Order Value',   key: 'orderValue',   type: 'currency' },
            { header: 'Status',        key: 'status',       type: 'text' },
            ...dateColumns.map(c => ({ header: c.title, key: `date_${c.key}`, type: 'date' })),
            { header: 'Created Date',  key: 'createdDate',  type: 'date' },
        ];

        const data = assembled.map(o => {
            const dateMap = Object.fromEntries(o.dates.map(d => [d.normalisedTitle, d.value]));
            const row = {
                orderId: o.order_id,
                customerId: o.customer_id,
                customerName: o.customer_name || '',
                productName: o.items.map(it => it.product_id != null ? `${it.product_name} (${it.product_id})` : it.product_name).join('\n'),
                quantity: o.items.map(it => String(it.quantity)).join('\n'),
                orderValue: o.order_value,
                // Exports the actual saved DB status (never button colour/
                // styling) as its readable label — every order has a
                // status since the column is NOT NULL DEFAULT 'pending'.
                status: ORDER_STATUS_LABELS[o.status] || o.status || '—',
                createdDate: o.created_date,
            };
            dateColumns.forEach(c => { row[`date_${c.key}`] = dateMap[c.key] || null; });
            return row;
        });

        const workbook = buildWorkbook({ sheetName: 'Order Tracking', columns, rows: data });
        await sendWorkbook(res, workbook, buildExportFilename('order-tracking'));
    } catch (err) {
        return res.json({ status: 0, message: "Failed to generate export" });
    }
};

